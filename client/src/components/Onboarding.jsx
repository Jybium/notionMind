import React, { useState, useEffect } from 'react';
import { 
  User, 
  Key, 
  Database, 
  Mail, 
  Calendar, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  Zap,
  Lock
} from 'lucide-react';
import './Onboarding.css';

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState(localStorage.getItem('nm_user_id'));
  const [anthropicKey, setAnthropicKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If userId exists, we might still need to finish onboarding (Notion/Anthropic)
  useEffect(() => {
    if (userId) {
      // Check if user has workspaces / keys
      fetch(`/api/users/${userId}`)
        .then(res => res.json())
        .then(data => {
          if (data.workspaces?.some(w => w.token) && data.anthropicKey) {
            onComplete(userId, data.workspaces[0].id);
          } else if (data.workspaces?.some(w => w.token)) {
            setStep(3); // Go to Anthropic Key step
          } else {
            setStep(2); // Go to Notion step
          }
        })
        .catch(() => setStep(1));
    }
  }, [userId]);

  const loginWithGoogle = () => {
    window.location.href = '/api/auth/google';
  };

  const connectNotion = () => {
    window.location.href = `/api/auth/notion?userId=${userId}`;
  };

  const saveKeys = async () => {
    if (!anthropicKey && !geminiKey) return showToast('At least one AI Key (Anthropic or Gemini) is required', 'error');
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anthropicKey, geminiKey })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || 'Failed to save key');
      showToast('Setup complete! Welcome to NotionMind.', 'success');
      onComplete(userId, data.workspaces?.[0]?.id || 'default');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-screen">
      <div className="onboarding-orb-1" />
      <div className="onboarding-orb-2" />
      
      <div className="onboarding-card">
        <div className="onboarding-progress">
          <div className={`progress-dot ${step >= 1 ? 'active' : ''}`} />
          <div className={`progress-dot ${step >= 2 ? 'active' : ''}`} />
          <div className={`progress-dot ${step >= 3 ? 'active' : ''}`} />
        </div>

        {step === 1 && (
          <div className="onboarding-step">
            <div className="step-icon"><User size={32} strokeWidth={1.5} /></div>
            <h1>Secure Identity</h1>
            <p>Sign in with Google to create your secure NotionMind account. This enables cross-device sync and automated Gmail/Calendar integration.</p>
            <button className="onboarding-btn google-btn" onClick={loginWithGoogle}>
              <Mail size={18} /> Sign in with Google
            </button>
            <div className="step-footer">
              <Lock size={12} /> Your data is encrypted and stored in your private database.
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step">
            <div className="step-icon"><Sparkles size={32} strokeWidth={1.5} /></div>
            <h1>Connect Notion</h1>
            <p>Next, connect your Notion workspace. This allows the AI to read your databases, pages, and tasks automatically—no manual tokens required.</p>
            <button className="onboarding-btn notion-btn" onClick={connectNotion}>
              <Database size={18} /> Connect Notion Workspace
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-step">
            <div className="step-icon"><Zap size={32} strokeWidth={1.5} /></div>
            <h1>Assistant Brain</h1>
            <p>Finally, provide your Anthropic API Key. This powers the "brain" of your assistant (Claude 3.5 Sonnet).</p>
            
            <div className="step-fields">
              <div className="field-group">
                <label>Anthropic API Key (Claude)</label>
                <div className="input-with-icon">
                  <Key size={16} className="input-icon" />
                  <input 
                    type="password" 
                    value={anthropicKey} 
                    onChange={e => setAnthropicKey(e.target.value)} 
                    placeholder="sk-ant-..." 
                  />
                </div>
              </div>
              <div className="field-group" style={{marginTop: 12}}>
                <label>Gemini API Key (Free Tier)</label>
                <div className="input-with-icon">
                  <Zap size={16} className="input-icon" />
                  <input 
                    type="password" 
                    value={geminiKey} 
                    onChange={e => setGeminiKey(e.target.value)} 
                    placeholder="AIza..." 
                  />
                </div>
              </div>
            </div>

            {error && <div className="onboarding-error">{error}</div>}

            <button className="onboarding-btn" onClick={saveKeys} disabled={loading}>
              {loading ? 'Finalizing...' : 'Launch NotionMind'} <CheckCircle2 size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
