import express from 'express';
import { prisma } from '../services/db.service.js';
import logger from '../services/logger.js';
import { getAnthropicClient, BASE_SYSTEM } from '../services/anthropic.service.js';
import { getGeminiClient, BASE_SYSTEM_GEMINI, GEMINI_TOOLS } from '../services/gemini.service.js';
import { buildMCPServers } from '../services/mcp.service.js';
import { refreshGoogleAccessToken } from '../services/auth.service.js';
import { getPageContent, searchNotion } from '../services/notion.service.js';
import { getUnreadEmails } from '../services/gmail.service.js';
import { getCalendarEvents } from '../services/calendar.service.js';

const router = express.Router();

router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(sessions);
  } catch (err) {
    logger.error('Fetch Sessions Error:', err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.get('/:sessionId/messages', async (req, res) => {
  const { sessionId } = req.params;
  try {
    const messages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' }
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/stream', async (req, res) => {
  const {
    message,
    sessionId = 'default',
    useGmail = false,
    useCalendar = false,
    workspaceId,
    userId,
    documentId,
    provider
  } = req.body;

  if (!message?.trim()) return res.status(400).json({ error: 'message required' });
  if (!userId) return res.status(401).json({ error: 'userId is required' });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });

    const hasAnthropic = !!user.anthropicKey;
    const hasGemini = !!user.geminiKey;
    if (!hasAnthropic && !hasGemini) {
      return res.status(401).json({ error: 'No AI key configured', code: 'KEY_MISSING' });
    }

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    const notionToken = workspace?.token || user.notionKey;

    let docContext = '';
    if (documentId) {
      try {
        docContext = await getPageContent(documentId, notionToken);
      } catch (err) {
        logger.error('Notion Context Error:', err);
      }
    }

    let session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      session = await prisma.session.create({
        data: { id: sessionId, workspaceId, userId, title: message.slice(0, 40) }
      });
    } else {
      await prisma.session.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() }
      });
    }

    await prisma.message.create({
      data: { sessionId, role: 'user', content: message }
    });

    const dbMessages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 20
    });

    const googleAccessToken = await refreshGoogleAccessToken(user.gmailToken);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const send = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    send('connected', { ok: true });

    let fullReply = '';
    let useProvider = provider?.startsWith('gemini') ? 'gemini' : 'claude';
    if (useProvider === 'claude' && !hasAnthropic) useProvider = 'gemini';
    if (useProvider === 'gemini' && !hasGemini) useProvider = 'claude';

    if (useProvider === 'claude') {
      const anthropic = getAnthropicClient(user.anthropicKey);
      const stream = await anthropic.messages.stream({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: docContext ? `${BASE_SYSTEM}\n\nDOCUMENT:\n${docContext}` : BASE_SYSTEM,
        messages: dbMessages.map(m => ({ role: m.role, content: m.content })),
        tools: buildMCPServers(notionToken, useGmail ? googleAccessToken : null, useCalendar ? googleAccessToken : null),
      });

      stream.on('text', (text) => { fullReply += text; send('delta', { type: 'text', text }); });
      stream.on('tool_use', (tool) => {
        send('delta', { type: 'tool_use', name: tool.name, input: tool.input });
      });
      stream.on('message', async (msg) => {
        await prisma.message.create({ data: { sessionId, role: 'assistant', content: fullReply } });
        await prisma.user.update({ where: { id: userId }, data: { tokenUsageClaude: { increment: msg.usage.input_tokens + msg.usage.output_tokens } } });
        send('done', { ok: true });
        res.end();
      });
      stream.on('error', (err) => { send('error', { message: err.message }); res.end(); });

    } else {
      try {
        const client = getGeminiClient(user.geminiKey);
        const sysInst = docContext ? `${BASE_SYSTEM_GEMINI}\n\nDOCUMENT:\n${docContext}` : BASE_SYSTEM_GEMINI;

        const history = dbMessages.slice(0, -1).map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

        history.push({ role: 'user', parts: [{ text: message }] });

        let reqArgs = {
          model: provider === 'gemini-lite' ? 'gemini-3.1-flash-lite' : 'gemini-3.1-pro-preview',
          contents: history,
          config: {
            systemInstruction: sysInst,
            tools: GEMINI_TOOLS
          }
        };

        let responseStream;
        try {
          responseStream = await client.models.generateContentStream(reqArgs);
        } catch (initialErr) {
          if (initialErr.status === 429 || (initialErr.message && initialErr.message.includes('429')) || (initialErr.message && initialErr.message.includes('RESOURCE_EXHAUSTED'))) {
            reqArgs.model = 'gemini-2.5-flash'; // Fallback to a free-tier friendly model
            send('delta', { type: 'text', text: '*(Gemini 3.1 Pro preview quota exceeded. Seamlessly falling back to Gemini 2.5 Flash...)*\n\n' });
            fullReply += '*(Gemini 3.1 Pro preview quota exceeded. Seamlessly falling back to Gemini 2.5 Flash...)*\n\n';
            responseStream = await client.models.generateContentStream(reqArgs);
          } else {
            throw initialErr;
          }
        }
        let iteration = 0;

        while (iteration < 5) {
          iteration++;
          let toolCalls = [];

          for await (const chunk of responseStream) {
            if (chunk.functionCalls && chunk.functionCalls.length > 0) {
              toolCalls.push(...chunk.functionCalls);
            }
            if (chunk.text) {
              fullReply += chunk.text;
              send('delta', { type: 'text', text: chunk.text });
            }
          }

          if (toolCalls.length === 0) break;

          let functionResponses = [];

          for (const call of toolCalls) {
            const { name, args } = call;
            send('delta', { type: 'tool_use', name, input: args });

            let toolResponse = "";
            if (name === "get_unread_emails") {
              toolResponse = useGmail ? await getUnreadEmails(googleAccessToken, args.maxResults) : "Gmail integration disabled.";
            } else if (name === "get_calendar_events") {
              toolResponse = useCalendar ? await getCalendarEvents(googleAccessToken, args.maxResults) : "Calendar integration disabled.";
            } else if (name === "search_notion") {
              toolResponse = notionToken ? await searchNotion(args.query, notionToken) : "Notion integration not configured for this workspace.";
              if (Array.isArray(toolResponse)) {
                toolResponse = toolResponse.length > 0
                  ? toolResponse.map(p => `[${p.title}](id: ${p.id})`).join("\n")
                  : "No matching pages found.";
              }
            } else if (name === "get_notion_page") {
              toolResponse = notionToken ? await getPageContent(args.pageId, notionToken) : "Notion integrated not configured.";
            }

            functionResponses.push({
              functionResponse: { name, response: { content: toolResponse } }
            });
          }

          history.push({ role: 'model', parts: toolCalls.map(c => ({ functionCall: c })) });
          history.push({ role: 'user', parts: functionResponses });

          reqArgs.contents = history;
          responseStream = await client.models.generateContentStream(reqArgs);
        }

        await prisma.message.create({ data: { sessionId, role: 'assistant', content: fullReply } });
        const tokens = Math.ceil((message.length + fullReply.length) / 4);
        await prisma.user.update({ where: { id: userId }, data: { tokenUsageGemini: { increment: tokens } } });
        send('done', { ok: true });
        res.end();
      } catch (gemError) {
        logger.error('Gemini Error:', gemError);
        send('error', { message: gemError.message });
        res.end();
      }
    }
  } catch (err) {
    logger.error('Chat error:', err);
    res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
    res.end();
  }
});

router.delete('/:sessionId', async (req, res) => {
  try {
    await prisma.session.delete({ where: { id: req.params.sessionId } });
    res.json({ cleared: true });
  } catch (e) {
    res.json({ cleared: true });
  }
});

export default router;
