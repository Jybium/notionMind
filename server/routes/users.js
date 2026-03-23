import express from 'express';
import { prisma } from '../services/db.service.js';
import logger from '../services/logger.js';

const router = express.Router();

// Onboard a new user
router.post('/onboard', async (req, res) => {
  const { name, anthropicKey, geminiKey, notionKey, gmailToken, calendarToken } = req.body;
  
  if (!anthropicKey && !geminiKey) {
    return res.status(400).json({ error: 'At least one AI Key (Anthropic or Gemini) is required' });
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: name || 'Anonymous User',
        anthropicKey,
        geminiKey,
        notionKey,
        gmailToken,
        calendarToken
      }
    });
    
    // Create a default workspace for the user
    const workspace = await prisma.workspace.create({
      data: {
        name: 'My Workspace',
        userId: user.id
      }
    });

    res.json({ user, workspaceId: workspace.id });
  } catch (error) {
    console.error('Onboarding Error:', error);
    res.status(500).json({ error: 'Failed to create user profile' });
  }
});

// Update a user
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { anthropicKey, geminiKey, notionKey, gmailToken, calendarToken } = req.body;
  
  try {
    const data = {};
    if (anthropicKey !== undefined) data.anthropicKey = anthropicKey;
    if (geminiKey !== undefined) data.geminiKey = geminiKey;
    if (notionKey !== undefined) data.notionKey = notionKey;
    if (gmailToken !== undefined) data.gmailToken = gmailToken;
    if (calendarToken !== undefined) data.calendarToken = calendarToken;

    const user = await prisma.user.update({
      where: { id },
      data
    });
    res.json(user);
  } catch (error) {
    logger.error('Update User Error:', error);
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
});

// Get user profile
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { workspaces: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
