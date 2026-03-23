import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';
import logger from './services/logger.js';

import chatRouter from './routes/chat.js';
import agentRouter from './routes/agent.js';
import workspacesRouter from './routes/workspaces.js';
import reportRouter from './routes/report.js';
import usersRouter from './routes/users.js';
import authRouter from './routes/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/chat', chatRouter);
app.use('/api/agent', agentRouter);
app.use('/api/workspaces', workspacesRouter);
app.use('/api/report', reportRouter);
app.use('/api/users', usersRouter);
app.use('/api/auth', authRouter);

// ── GET /api/commands ─────────────────────────────────────────────────────────
app.get('/api/commands', (req, res) => {
  const { q = '' } = req.query;
  const ALL = [
    { id: 'tasks-open',       category: 'Notion',   icon: '✅', label: 'Show open tasks',              prompt: 'List all open tasks across my workspace, grouped by project.' },
    { id: 'tasks-overdue',    category: 'Notion',   icon: '⚠️', label: 'Show overdue tasks',            prompt: 'Find all overdue tasks. Include assignee, days overdue, and suggested priority.' },
    { id: 'project-briefing', category: 'Notion',   icon: '📊', label: 'Full project briefing',         prompt: 'Give me a full status briefing on all active projects — status, blockers, next steps.' },
    { id: 'roadmap-summary',  category: 'Notion',   icon: '🗺️', label: 'Summarize Q2 roadmap',         prompt: 'Read and summarize the Q2 roadmap page. Highlight milestones and what is at risk.' },
    { id: 'create-notes',     category: 'Notion',   icon: '📝', label: 'Create meeting notes page',     prompt: 'Create a meeting notes page for today with sections: Attendees, Agenda, Decisions, Action Items.' },
    { id: 'inbox-unread',     category: 'Gmail',    icon: '📬', label: 'Show unread emails',            prompt: 'Check my Gmail inbox and summarize the top 5 unread emails. Flag anything urgent.', gmail: true },
    { id: 'email-followups',  category: 'Gmail',    icon: '↩️', label: 'Emails needing reply',          prompt: 'Find emails older than 2 days with no reply.', gmail: true },
    { id: 'calendar-today',   category: 'Calendar', icon: '📅', label: 'Today\'s calendar',              prompt: 'What is on my calendar today? Include times and prep notes.', calendar: true },
    { id: 'daily-briefing',   category: 'Agent',    icon: '☀️', label: 'Run daily briefing',            special: 'agent', agentGoal: 'Generate my daily briefing: check overdue Notion tasks, unread important emails, and today\'s calendar events. Give a prioritized morning brief.' },
    { id: 'triage-backlog',   category: 'Agent',    icon: '🤖', label: 'Triage feature backlog',        special: 'agent', agentGoal: 'Go through the feature backlog database in Notion. For each unreviewed item, write a one-line assessment and suggest a priority: High, Medium, or Low. Update each item.' },
    { id: 'sync-tasks-cal',   category: 'Agent',    icon: '🔄', label: 'Sync overdue tasks to calendar',special: 'agent', agentGoal: 'Find all overdue Notion tasks. For each, create a 1-hour Google Calendar event this week to work on it, then update the task status to Scheduled.' },
    { id: 'export-pdf',       category: 'Export',   icon: '📄', label: 'Export workspace report PDF',   special: 'pdf' },
  ];
  const lower = q.toLowerCase();
  const filtered = q
    ? ALL.filter((c) => c.label.toLowerCase().includes(lower) || c.category.toLowerCase().includes(lower))
    : ALL;
  res.json(filtered);
});

// ── GET /api/health ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── POST /api/logs (Frontend Logging) ──────────────────────────────────────────
app.post('/api/logs', (req, res) => {
  const { level, message, details, stack } = req.body;
  const logMethod = logger[level] || logger.info;
  logMethod({ message: `[Client] ${message}`, details, stack });
  res.sendStatus(200);
});

// ── Error Middleware ─────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(`Unhandled Error: ${err.message}`, { 
    path: req.path, 
    method: req.method,
    stack: err.stack 
  });
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});



// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`🧠 NotionMind v2 (Modular+Prisma) → http://localhost:${PORT}`);
});
