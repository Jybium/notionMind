import React, { useState } from 'react';
import { 
  Bot, 
  Cpu, 
  Zap, 
  Check, 
  ChevronRight, 
  Play, 
  AlertCircle,
  Lightbulb,
  Sun,
  Layers,
  Calendar
} from 'lucide-react';
import './AgentView.css';

const SESSION_ID = "ag-" + Math.random().toString(36).slice(2, 9);

const EXAMPLE_GOALS = [
  { text: "Find recent emails about 'Project X' and summarize them", icon: Bot },
  { text: "Check my calendar for tomorrow and create a Notion summary", icon: Calendar },
  { text: "Find the latest report in Notion and email it to me", icon: Layers }
];

export default function AgentView({ workspaceId, userId, modelProvider, showToast }) {
  const [goal, setGoal] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [trace, setTrace] = useState([]);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const runAgent = async (goalText) => {
    const g = (goalText || goal).trim();
    if (!g || isRunning) return;
    setGoal(g);
    setIsRunning(true);
    setTrace([]);
    setResult('');
    setError('');

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          goal: g, 
          sessionId: SESSION_ID, 
          workspaceId, 
          userId,
          provider: modelProvider
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
        setIsRunning(false);
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
            if (data.type === 'thinking') {
              setTrace(prev => [...prev, { type: 'thinking', text: data.text }]);
            } else if (data.type === 'tool_use') {
              setTrace(prev => [...prev, { type: 'tool', text: `Using: ${data.name}` }]);
            } else if (data.type === 'tool_result') {
              setTrace(prev => [...prev, { type: 'result', text: data.content?.slice(0, 200) + (data.content?.length > 200 ? '...' : '') }]);
            } else if (data.type === 'done') {
              setResult(data.result || '');
            } else if (data.type === 'error') {
              let msg = data.message || 'Unknown error';
              try {
                const parsed = JSON.parse(msg);
                if (parsed.error?.message) msg = parsed.error.message;
              } catch {}
              setError(msg);
            }
          } catch {}
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="agent-wrap">
      <div className="agent-goal-section">
        <div className="agent-goal-label">Agent Goal</div>
        <div className="agent-goal-input-row">
          <textarea
            className="agent-goal-input"
            value={goal}
            onChange={e => setGoal(e.target.value)}
            placeholder="Describe a multi-step task for your AI agent..."
            rows={2}
            disabled={isRunning}
          />
          <button className="agent-run-btn" onClick={() => runAgent()} disabled={!goal.trim() || isRunning}>
            {isRunning
              ? <><div className="agent-run-spinner" /> Running...</>
              : <><Play size={16} fill="currentColor" /> Run Agent</>
            }
          </button>
        </div>
      </div>

      <div className="agent-trace">
        {trace.length === 0 && !result && !error && (
          <div className="agent-empty">
            <div className="agent-empty-icon"><Bot size={48} strokeWidth={1.5} /></div>
            <h3>Ready to run</h3>
            <p>Describe your goal above and the agent will plan and execute it step by step.</p>
            <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:12, width: '100%', maxWidth: 400}}>
              {EXAMPLE_GOALS.map(g => {
                const Icon = g.icon;
                return (
                  <button
                    key={g.text}
                    onClick={() => { setGoal(g.text); runAgent(g.text); }}
                    className="agent-example-btn"
                  >
                    <Icon size={14} /> {g.text}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {trace.map((step, i) => (
          <div key={i} className={`trace-step ${step.type}`}>
            <div className="trace-indicator">
              <div className={`trace-dot ${step.type}`}>
                {step.type === 'thinking' ? <Lightbulb size={12} /> : step.type === 'tool' ? <Zap size={11} /> : <Check size={12} />}
              </div>
              {i < trace.length - 1 && <div className="trace-line" />}
            </div>
            <div className="trace-body">
              <div className="trace-label">
                {step.type === 'thinking' ? 'Thinking' : step.type === 'tool' ? 'Tool Use' : 'Step Result'}
              </div>
              <div className="trace-text">{step.text}</div>
            </div>
          </div>
        ))}

        {result && (
          <div className="agent-result">
            <div className="agent-result-label"><Check size={16} /> Completed</div>
            <div className="agent-result-text">{result}</div>
          </div>
        )}

        {error && (
          <div className="agent-error-state">
            <AlertCircle size={18} /> {error}
          </div>
        )}
      </div>
    </div>
  );
}
