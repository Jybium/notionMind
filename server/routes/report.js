import express from 'express';
import { prisma } from '../services/db.service.js';
import { getAnthropicClient } from '../services/anthropic.service.js';
import { buildMCPServers } from '../services/mcp.service.js';
import { refreshGoogleAccessToken } from '../services/auth.service.js';

const router = express.Router();

router.post('/generate', async (req, res) => {
  const { workspaceId, userId } = req.body;
  
  if (!userId) return res.status(401).json({ error: 'userId is required' });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    if (!user.anthropicKey) return res.status(401).json({ error: 'Anthropic key not configured', code: 'KEY_MISSING' });

    // Get workspace for Notion token
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    const notionToken = workspace?.token || user.notionKey;

    // Refresh Google token
    const googleAccessToken = await refreshGoogleAccessToken(user.gmailToken);

    const anthropic = getAnthropicClient(user.anthropicKey);
    const mcpServers = buildMCPServers(notionToken, googleAccessToken, googleAccessToken);

    const response = await anthropic.beta.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      system: "You are a business analyst. Generate a comprehensive status report based on Notion tasks, recent emails, and calendar events.",
      messages: [{ role: 'user', content: 'Generate a full weekly status report.' }],
      betas: ['mcp-client-2025-04-04'],
      mcp_servers: mcpServers,
    });

    const reportContent = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    res.json({ report: reportContent });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
