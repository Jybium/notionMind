# 🧠 NotionMind v2

**Your AI workspace brain — Notion + Gmail + Calendar + Autonomous Agents**

> Built for the [MLH × Notion AI Challenge](https://mlh.io)

---

## What's New in v2

| Feature | v1 | v2 |
|---|---|---|
| Notion MCP (read/write) | ✅ | ✅ |
| Gmail MCP integration | ❌ | ✅ |
| Google Calendar MCP | ❌ | ✅ |
| Autonomous agent mode | ❌ | ✅ |
| Multi-workspace support | ❌ | ✅ |
| Command palette (⌘K) | ❌ | ✅ |
| Scheduled daily briefing | ❌ | ✅ |
| PDF report export | ❌ | ✅ |
| SSE streaming | ✅ | ✅ |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    NotionMind v2 Frontend                    │
│  Chat View │ Agent Mode │ ⌘K Command Palette │ WS Switcher   │
└───────────────────────┬──────────────────────────────────────┘
                        │ HTTP / SSE
┌───────────────────────▼──────────────────────────────────────┐
│                    Express Server                            │
│  /api/chat/stream  │  /api/agent  │  /api/report/pdf        │
│  /api/commands     │  /api/workspaces  │  /api/health       │
└──────┬────────────────────┬────────────────────┬─────────────┘
       │ MCP                │ MCP                │ MCP
┌──────▼──────┐   ┌─────────▼───────┐  ┌────────▼──────────┐
│ Notion MCP  │   │   Gmail MCP     │  │ Google Calendar   │
│ (read/write)│   │ (read + send)   │  │ MCP (CRUD events) │
└─────────────┘   └─────────────────┘  └───────────────────┘
```

---

## Quick Start

```bash
git clone https://github.com/yourname/notionmind
cd notionmind
npm install
cp .env.example .env   # fill in your keys
npm start              # → http://localhost:3000
```

---

## Environment Variables

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...
NOTION_API_KEY=secret_...

# Optional — enables Gmail MCP toggle in UI
GMAIL_OAUTH_TOKEN=...

# Optional — enables Calendar MCP toggle in UI
GCAL_OAUTH_TOKEN=...

# Optional — second workspace
NOTION_API_KEY_2=...
NOTION_WORKSPACE_NAME_2=Work Workspace

# Scheduled daily briefing (cron, default: 8am Mon-Fri)
BRIEFING_CRON=0 8 * * 1-5
```

---

## Features

### ⌘K Command Palette
Press `⌘K` (or `Ctrl+K`) anywhere to open the command palette. Search and execute any action:
- Notion actions (tasks, projects, pages)
- Gmail actions (inbox, follow-ups)
- Calendar actions (today's schedule)
- Agent goals (pre-built multi-step tasks)
- Export to PDF

### 🤖 Autonomous Agent Mode
Switch to Agent tab and describe a high-level goal. The agent:
1. Breaks it into steps
2. Calls Notion/Gmail/Calendar tools for each step
3. Shows a live step-by-step trace with tool calls
4. Summarizes what was accomplished

Example goals:
- *"Find all overdue tasks, email assignees a reminder, and block time on my calendar to review them"*
- *"Triage the feature backlog and update each item's priority field"*
- *"Generate a weekly status email from Notion data and draft it in Gmail"*

### 🔌 Integration Toggles
Toggle Gmail and Calendar MCP on/off per conversation. When enabled, Claude can:
- Gmail: Read inbox, find emails needing replies, send emails
- Calendar: Read today's events, create events from Notion tasks, check availability

### 🏢 Multi-Workspace Support
Switch between Notion workspaces from the header dropdown. Each session remembers its active workspace.

### ☀️ Scheduled Daily Briefing
Runs automatically on a cron schedule. Reads Notion tasks, Gmail, and Calendar, then logs (or emails) a prioritized morning brief. Extend to push to Slack, a Notion page, or email.

### 📄 PDF Report Export
Calls Claude with Notion MCP to generate a live workspace report, then renders it as a styled PDF — downloadable directly from the browser.

---

## API Reference

### `POST /api/chat/stream` — SSE streaming chat
```json
{ "message": "...", "sessionId": "...", "useGmail": true, "useCalendar": false }
```

Events: `delta` (text chunk) · `tool` (MCP tool called) · `done` · `error`

### `POST /api/agent` — Autonomous agent (SSE)
```json
{ "goal": "Find overdue tasks and email assignees", "sessionId": "..." }
```

Events: `start` · `step_start` · `tool` · `step_result` · `complete` · `error`

### `POST /api/report/pdf` — Download workspace report as PDF
```json
{ "sessionId": "...", "title": "Q2 Status Report" }
```

### `GET /api/commands?q=` — Command palette search
Returns filterable list of all available commands/actions.

### `GET /api/workspaces` — List workspaces
### `POST /api/workspaces/switch` — Switch active workspace
### `DELETE /api/chat/:sessionId` — Clear session history
### `GET /api/health` — Integration status check

---

## Project Structure

```
notionmind/
├── server/
│   └── index.js        # Express + Claude + all MCP integrations + cron + PDF
├── public/
│   └── index.html      # Full UI: chat, agent mode, ⌘K palette, toggles
├── .env.example
├── package.json
└── README.md
```

---

## License

MIT
