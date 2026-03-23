import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  User,
  Zap,
  Send,
  MessageSquare,
  FileText,
  X as CloseIcon
} from 'lucide-react';
import Skeleton from './Skeleton';
import CalendarWidget from './CalendarWidget';
import './ChatView.css';

const CHIPS = [
  'Show my open Notion tasks',
  'Find overdue tasks',
  'Give me a project briefing',
];

const ChatView = ({
  user,
  workspaceId,
  sessionId,
  modelProvider,
  useGmail,
  useCalendar,
  quickPrompt,
  showToast,
  onMessageSent,
  selectedDoc,
  setSelectedDoc
}) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [pages, setPages] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const userId = user?.id;

  const fetchMessages = async () => {
    if (!sessionId) return;
    setIsHistoryLoading(true);
    try {
      const res = await fetch(`/api/chat/${sessionId}/messages`);
      const data = await res.json();
      if (Array.isArray(data)) setMessages(data);
    } catch {
      showToast('Failed to load chat history', 'error');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [sessionId]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isHistoryLoading]);

  useEffect(() => {
    if (quickPrompt) { setInput(quickPrompt); textareaRef.current?.focus(); }
  }, [quickPrompt]);

  useEffect(() => {
    if (workspaceId) {
      setPages([]); // Clear old pages

      fetch(`/api/workspaces/${workspaceId}/pages`)
        .then(res => res.json())
        .then(data => {
          setPages(data);
          if (data.length === 0) {
            showToast('No documents found in this workspace', 'info');
          }
        })
        .catch(err => {
          console.error('Failed to fetch pages:', err);
          showToast('Failed to fetch workspace documents', 'error');
        });
    }
  }, [workspaceId]);

  const sendMessage = async (text) => {
    if (!text?.trim() || isLoading) return;
    const userMsg = { role: 'user', content: text, id: Date.now(), createdAt: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const assistantId = Date.now() + 1;
    setMessages(prev => [...prev, { role: 'assistant', content: '', id: assistantId, tools: [], createdAt: new Date() }]);

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId,
          useGmail,
          useCalendar,
          workspaceId,
          userId,
          provider: modelProvider,
          documentId: selectedDoc?.id
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.code === 'USER_NOT_FOUND') {
          localStorage.removeItem('nm_user_id');
          localStorage.removeItem('nm_workspace_id');
          window.location.reload();
          return;
        }
        showToast(err.error || 'Request failed', 'error');
        setIsLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text') {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: m.content + data.text } : m
              ));
            } else if (data.type === 'tool_use') {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, tools: [...(m.tools || []), data.name] } : m
              ));
            } else if (data.type === 'error') {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: `⚠ ${data.message}` } : m
              ));
            }
          } catch { }
        }
      }
      if (onMessageSent) onMessageSent();
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: `⚠ Error: ${err.message}` } : m
      ));
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return 'Just now';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-wrap">
      {isHistoryLoading ? (
        <div className="chat-messages p-4">
          {[1, 2, 3].map(i => (
            <div key={i} className={`message ${i % 2 === 0 ? 'assistant' : 'user'} mb-6`} style={{ opacity: 0.7 }}>
              <div className="msg-avatar">
                <Skeleton width="32px" height="32px" borderRadius="50%" />
              </div>
              <div className="msg-content w-full" style={{ flex: 1 }}>
                <Skeleton width={i % 2 === 0 ? "80%" : "60%"} height="60px" borderRadius="12px" />
              </div>
            </div>
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="chat-empty">
          <div className="chat-empty-orb"><MessageSquare size={48} strokeWidth={1.5} /></div>
          <h2>How can I help today?</h2>
          <p>Ask me anything about your Notion workspace, Gmail, or Google Calendar.</p>
          <div className="chat-empty-chips">
            {CHIPS.map(chip => (
              <button key={chip} className="chat-chip" onClick={() => sendMessage(chip)}>{chip}</button>
            ))}
          </div>
        </div>
      ) : (
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="msg-avatar">
                {msg.role === 'user' ? (
                  user?.profileImage ? (
                    <img src={user.profileImage} alt="User" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <User size={18} />
                  )
                ) : (
                  <span style={{ fontSize: 20 }}>🧠</span>
                )}
              </div>
              <div className="msg-content">
                <div className="msg-bubble">
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, inline, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '');
                          if (!inline && match && match[1] === 'calendar') {
                            try {
                              const events = JSON.parse(String(children).replace(/\\n$/, ''));
                              return <CalendarWidget events={events} />;
                            } catch (e) {
                              return <code className={className} {...props}>{children}</code>;
                            }
                          }
                          return <code className={className} {...props}>{children}</code>;
                        }
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.tools?.length > 0 && (
                  <div className="tool-pills">
                    {msg.tools.map((t, i) => <span key={i} className="tool-pill"><Zap size={11} /> {t}</span>)}
                  </div>
                )}
                <div className="msg-time">{formatTime(msg.createdAt)}</div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="typing-indicator">
              <div className="msg-avatar" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface3)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 16 }}>🧠</span>
              </div>
              <div className="typing-dots">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="chat-input-area">


        <div className="chat-input-form">
          <button
            className={`chat-doc-btn ${showPicker ? 'active' : ''}`}
            onClick={() => {
              if (pages.length === 0) {
                showToast('No Notion documents found. Try syncing your workspace in Settings.', 'info');
              }
              setShowPicker(!showPicker);
            }}
            title="Chat with a specific document"
          >
            <FileText size={18} />
          </button>

          {showPicker && (
            <div className="doc-picker-dropdown">
              <div className="picker-header">Select a document</div>
              <div className="picker-list">
                {pages.length === 0 && (
                  <div className="picker-empty">
                    <p>No workspace pages found</p>
                    <span style={{ fontSize: 11, color: 'var(--text4)', display: 'block', marginTop: 4 }}>
                      Only recently edited pages appear here.
                    </span>
                  </div>
                )}
                {pages.map(p => (
                  <div key={p.id} className="picker-item" onClick={() => {
                    setSelectedDoc(p);
                    setShowPicker(false);
                    showToast(`Now focused on: ${p.title}`, 'success');
                  }}>
                    <FileText size={14} />
                    <span>{p.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <textarea
            ref={textareaRef}
            className="chat-textarea"
            rows={1}
            placeholder="Ask anything about your workspace..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
          />
          <button
            className="chat-send-btn"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            title="Send (Enter)"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="chat-input-hint">Enter to send · Shift+Enter for newline</div>
      </div>
    </div>
  );
};

export default ChatView;
