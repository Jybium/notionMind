import React from 'react';
import {
  MessageSquare,
  Plus,
  CheckCircle,
  AlertTriangle,
  BarChart,
  Mail,
  Calendar,
  Sun,
  Trash2
} from 'lucide-react';
const PROMPTS = [
  { icon: CheckCircle, text: 'Show open Notion tasks' },
  { icon: AlertTriangle, text: 'Find overdue tasks' },
  { icon: BarChart, text: 'Full project briefing' },
];
import Skeleton from './Skeleton';

export default function Sidebar({
  sessions = [],
  currentSessionId,
  isLoading = false,
  onSessionSelect,
  onNewSession,
  onPromptSelect,
  onSessionDelete
}) {
  return (
    <aside className="sidebar">
      <button className="sidebar-item active" style={{ marginBottom: 8, justifyContent: 'center', fontWeight: 600, gap: 10 }} onClick={onNewSession}>
        <Plus size={18} /> New Chat
      </button>

      <div className="sidebar-section-title">Quick Actions</div>
      {PROMPTS.map((p) => {
        const Icon = p.icon;
        return (
          <div
            key={p.text}
            className="sidebar-item items-center flex gap-4"
            onClick={() => onPromptSelect(p.text)}
            title={p.text}
          >
            <span className="icon"><Icon size={18} strokeWidth={2} /></span>
            <span className="sidebar-text">{p.text}</span>
          </div>
        );
      })}

      <div className="sidebar-divider" />
      <div className="sidebar-section-title">Recent Chats</div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {isLoading ? (
          [1, 2, 3, 4, 5].map(i => (
            <div key={i} className="sidebar-item" style={{ gap: 12, opacity: 0.6 }}>
              <Skeleton width="18px" height="18px" borderRadius="4px" />
              <Skeleton width="120px" height="14px" borderRadius="4px" />
            </div>
          ))
        ) : sessions.length === 0 ? (
          <div className="sidebar-item" style={{ color: 'var(--text4)', fontSize: 12.5, cursor: 'default', pointerEvents: 'none' }}>
            No sessions yet
          </div>
        ) : (
          sessions.map(s => (
            <div
              key={s.id}
              className={`sidebar-item ${s.id === currentSessionId ? 'active' : ''} items-center`}
              onClick={() => onSessionSelect(s.id)}
            >
              <span className="icon"><MessageSquare size={18} strokeWidth={2} /></span>
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.title || (s.id.startsWith('nm-') ? `Chat ${s.id.slice(3, 8)}` : s.id)}
              </span>
              <button
                className="delete-session-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onSessionDelete(s.id);
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
