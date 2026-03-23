import express from 'express';
import { prisma } from '../services/db.service.js';
import { searchNotion } from '../services/notion.service.js';
import logger from '../services/logger.js';

const router = express.Router();

// ... existing routes ...

// Search Notion pages in a workspace
router.get('/:id/search', async (req, res) => {
  const { id } = req.params;
  const { q } = req.query;
  try {
    const ws = await prisma.workspace.findUnique({ where: { id } });
    const token = ws?.token;
    if (!token || !q) return res.json([]);

    const results = await searchNotion(q, token);
    res.json(results);
  } catch (error) {
    logger.error('Workspace Search Error:', error);
    res.json([]);
  }
});

// Get workspaces for a specific user
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const workspaces = await prisma.workspace.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });
    res.json(workspaces);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

// Switch workspace (legacy support/validation)
router.post('/switch', async (req, res) => {
  const { workspaceId } = req.body;
  try {
    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!ws) return res.status(404).json({ error: 'Workspace not found' });
    res.json({ id: ws.id, name: ws.name });
  } catch (error) {
    res.status(500).json({ error: 'Error switching workspace' });
  }
});

// Get recent Notion pages for a workspace (for the document picker)
router.get('/:id/pages', async (req, res) => {
  const { id } = req.params;
  try {
    const ws = await prisma.workspace.findUnique({ where: { id } });
    const token = ws?.token;
    if (!token) return res.json([]);

    const { Client } = await import("@notionhq/client");
    const notion = new Client({ auth: token });
    const response = await notion.search({
      filter: { property: 'object', value: 'page' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
      page_size: 10
    });

    const pages = response.results.map(p => ({
      id: p.id,
      title: p.properties.title?.title[0]?.plain_text || p.properties.Name?.title[0]?.plain_text || "Untitled"
    }));
    res.json(pages);
  } catch (error) {
    logger.error('Fetch Notion Pages Error:', error);
    res.json([]); // Return empty list on failure
  }
});

export default router;
