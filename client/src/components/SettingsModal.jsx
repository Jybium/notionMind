import React, { useState, useEffect } from 'react';
import { Settings, X, Zap, BarChart3, Info, Mail, Database, CheckCircle2 } from 'lucide-react';
import Skeleton from './Skeleton';
import './SettingsModal.css';

export default function SettingsModal({ onClose, userId, showToast }) {
  const [user, setUser] = useState(null);
  const [anthropicKey, setAnthropicKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [loading, setLoading] = useState(false); // For initial data fetch
  const [saving, setSaving] = useState(false); // For save operation
  const [workspaces, setWorkspaces] = useState([]);

  useEffect(() => {
    if (userId) {
      setLoading(true);
      const fetchData = async () => {
        try {
          const [userData, workspacesData] = await Promise.all([
            fetch(`/api/users/${userId}`).then(res => res.json()),
            fetch(`/api/workspaces/user/${userId}`).then(res => res.json())
          ]);
          setUser(userData);
          setAnthropicKey(userData.anthropicKey || '');
          setGeminiKey(userData.geminiKey || '');
          setWorkspaces(workspacesData);
        } catch (error) {
          console.error('Failed to fetch user or workspace data:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [userId]);

  const save = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anthropicKey, geminiKey })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.details || data.error || 'Failed to save settings');
      }
      showToast('Settings saved successfully!', 'success');
      onClose();
    } catch (err) {
      console.error('Save error:', err);
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const overlayClick = (e) => { if (e.target === e.currentTarget) onClose(); };

  const connectNotion = () => {
    window.location.href = `/api/auth/notion?userId=${userId}`;
  };

  const reconnectGoogle = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="modal-overlay" onClick={overlayClick}>
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title">
            <span className="modal-title-icon"><Settings size={20} /></span>
            System Settings
          </div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <section className="settings-section">
            <div className="settings-section-header">
              <Zap size={16} />
              <h3>AI Configuration</h3>
            </div>
            <div className="settings-grid">
              <div className="modal-field">
                <label>Anthropic API Key (Claude)</label>
                {loading ? (
                  <Skeleton height="40px" />
                ) : (
                  <input
                    type="password"
                    value={anthropicKey}
                    onChange={e => setAnthropicKey(e.target.value)}
                    placeholder="sk-ant-..."
                  />
                )}
              </div>
              <div className="modal-field">
                <label className="mt-4 pt-4">Gemini API Key (Free Tier)</label>
                {loading ? (
                  <Skeleton height="40px" />
                ) : (
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={e => setGeminiKey(e.target.value)}
                    placeholder="AIza..."
                  />
                )}
              </div>
            </div>
            <p className="field-hint">Your keys are encrypted and used only for your requests.</p>
          </section>

          <section className="settings-section">
            <div className="settings-section-header">
              <BarChart3 size={16} />
              <h3>Usage & Quota</h3>
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Skeleton height="50px" />
                <Skeleton height="50px" />
              </div>
            ) : (
              <div className="usage-stats">
                <div className="usage-item">
                  <div className="usage-info">
                    <span>Claude (3.5 Sonnet)</span>
                    <span className="usage-val">{user?.tokenUsageClaude?.toLocaleString() || 0} units</span>
                  </div>
                  <div className="usage-bar-wrap">
                    <div className="usage-bar claude" style={{ width: `${Math.min(100, (user?.tokenUsageClaude / (user?.tokenQuota || 1000000)) * 100)}%` }} />
                  </div>
                </div>

                <div className="usage-item">
                  <div className="usage-info">
                    <span>Gemini (3.1 Flash Lite)</span>
                    <span className="usage-val">{user?.tokenUsageGemini?.toLocaleString() || 0} units</span>
                  </div>
                  <div className="usage-bar-wrap">
                    <div className="usage-bar gemini" style={{ width: `${Math.min(100, (user?.tokenUsageGemini / (user?.tokenQuota || 1000000)) * 100)}%` }} />
                  </div>
                </div>
              </div>
            )}
            <div className="usage-footer-hint">
              <Info size={12} />
              <span>Quota refresh: 1,000,000 units per cycle</span>
            </div>
          </section>

          <section className="settings-section">
            <h3><Database size={16} /> Integrations Status</h3>
            <div className="integration-status-list">
              <div className="status-item">
                <div className="status-item-info">
                  <Mail size={16} />
                  <div>
                    <div className="status-label">Google Identity & Gmail</div>
                    <div className="status-sub">
                      {loading ? <Skeleton width="140px" height="14px" /> : (user?.email || 'Not connected')}
                    </div>
                  </div>
                </div>
                {!loading && (
                  user?.googleId ? (
                    <button className="btn-status-action" onClick={reconnectGoogle}>Reconnect</button>
                  ) : (
                    <button className="btn-status-action primary" onClick={reconnectGoogle}>Sign in</button>
                  )
                )}
              </div>

              <div className="status-item">
                <div className="status-item-info">
                  <Database size={16} />
                  <div>
                    <div className="status-label">Notion Workspaces</div>
                    <div className="status-sub">
                      {loading ? <Skeleton width="100px" height="14px" /> : `${workspaces?.length || 0} spaces connected`}
                    </div>
                  </div>
                </div>
                {!loading && (
                  <button className="btn-status-action" onClick={connectNotion}>
                    {workspaces?.length > 0 ? 'Add Space' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <button className="btn-primary" onClick={save} disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
