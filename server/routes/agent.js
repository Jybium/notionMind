import express from 'express';
import { prisma } from '../services/db.service.js';
import logger from '../services/logger.js';
import { getAnthropicClient, AGENT_SYSTEM } from '../services/anthropic.service.js';
import { buildMCPServers } from '../services/mcp.service.js';
import { refreshGoogleAccessToken } from '../services/auth.service.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { goal, sessionId = 'agent-default', workspaceId, userId } = req.body;
  if (!goal?.trim()) return res.status(400).json({ error: 'goal required' });
  if (!userId) return res.status(401).json({ error: 'userId is required' });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    
    if (!user.anthropicKey) {
      if (user.geminiKey) {
        return res.status(401).json({ 
          error: 'Autonomous Agent features currently require Claude (Anthropic). Basic chat is available using your Gemini key!', 
          code: 'CLAUDE_REQUIRED' 
        });
      }
      return res.status(401).json({ error: 'Anthropic key not configured', code: 'KEY_MISSING' });
    }

    // Get workspace for Notion token
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    const notionToken = workspace?.token || user.notionKey;

    // Get fresh Google access token
    const googleAccessToken = await refreshGoogleAccessToken(user.gmailToken);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (ev, data) => {
      res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`);
      if (res.flush) res.flush();
    };
    send('start', { goal, timestamp: new Date().toISOString() });

    // 1. Create Execution Record
    const execution = await prisma.agentExecution.create({
      data: {
        goal,
        sessionId,
        workspaceId: workspaceId || 'ws1',
        status: 'running'
      }
    });

    const mcpServers = buildMCPServers(notionToken, googleAccessToken, googleAccessToken);
    
    const anthropic = getAnthropicClient(user.anthropicKey);
    let stepCount = 0;
    let agentMessages = [
      { role: 'user', content: `GOAL: ${goal}\n\nExecute this goal step by step using your tools.` },
    ];
    let continueLoop = true;
    let finalSummary = '';

    while (continueLoop && stepCount < 10) {
      stepCount++;
      send('step_start', { step: stepCount });

      const response = await anthropic.beta.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        system: AGENT_SYSTEM,
        messages: agentMessages,
        betas: ['mcp-client-2025-04-04'],
        mcp_servers: mcpServers,
      });

      const toolCalls = response.content.filter((b) => b.type === 'tool_use');
      for (const tool of toolCalls) {
        send('tool', { name: tool.name, input: tool.input, step: stepCount });
      }

      const stepText = response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n');

      send('step_result', { step: stepCount, text: stepText });

      // Save step
      await prisma.agentStep.create({
        data: {
          agentExecutionId: execution.id,
          stepNum: stepCount,
          text: stepText,
          toolCalls: JSON.stringify(toolCalls.map(t => t.name)),
        }
      });

      if (response.stop_reason === 'end_turn' || stepText.includes('COMPLETE:') || toolCalls.length === 0) {
        continueLoop = false;
        finalSummary = stepText;
        send('complete', { steps: stepCount, summary: stepText, usage: response.usage });
      } else {
        agentMessages.push({ role: 'assistant', content: response.content });
        agentMessages.push({ role: 'user', content: 'Continue with the next step.' });
      }
    }

    if (stepCount >= 10) {
      finalSummary = 'Max steps reached.';
      send('complete', { steps: stepCount, summary: finalSummary });
    }

    // Mark complete
    await prisma.agentExecution.update({
      where: { id: execution.id },
      data: { status: 'completed', result: finalSummary }
    });
    
    res.end();
  } catch (err) {
    console.error('Agent error:', err);
    send('error', { message: err.message });
    res.end();
  }
});

export default router;
