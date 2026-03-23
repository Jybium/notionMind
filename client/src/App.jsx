import { useState, useEffect } from 'react';
import { FileText, X as CloseIcon } from 'lucide-react';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import ChatView from './components/ChatView.jsx';
import AgentView from './components/AgentView.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import Onboarding from './components/Onboarding.jsx';
import Toast from './components/Toast.jsx';
import './App.css';

export default function App() {
  const [userId, setUserId] = useState(localStorage.getItem('nm_user_id'));
  const [user, setUser] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(localStorage.getItem('nm_workspace_id'));
  const [workspaces, setWorkspaces] = useState([]);
  const [sessionId, setSessionId] = useState(localStorage.getItem('nm_session_id') || 'default');
  const [sessions, setSessions] = useState([]);
  const [mode, setMode] = useState(new URLSearchParams(window.location.search).get('mode') || 'chat');
  const [modelProvider, setModelProvider] = useState(new URLSearchParams(window.location.search).get('model') || 'claude');
  const [useGmail, setUseGmail] = useState(false);
  const [useCalendar, setUseCalendar] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // New state
  const [quickPrompt, setQuickPrompt] = useState('');
  const [toast, setToast] = useState(null);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const handleDocumentSelect = (doc) => {
    setSelectedDoc(doc);
    if (doc) {
      // Force a fresh chat session for the new document
      const id = "nm-" + Math.random().toString(36).slice(2, 9);
      setSessionId(id);
      localStorage.setItem('nm_session_id', id);
      setMode('chat');
    }
  };

  const fetchSessions = async () => {
    if (!userId) return;
    setIsSessionsLoading(true);
    try {
      const res = await fetch(`/api/chat/user/${userId}`);
      const data = await res.json();
      if (Array.isArray(data)) setSessions(data);
    } catch {
      showToast('Failed to fetch sessions', 'error');
    } finally {
      setIsSessionsLoading(false);
    }
  };

  useEffect(() => {
    // Handle OAuth Callback Params & Session Retrieval from URL
    const params = new URLSearchParams(window.location.search);
    const uId = params.get('userId');
    const sId = params.get('session');
    const m = params.get('mode');
    const mp = params.get('model');

    if (uId) {
      localStorage.setItem('nm_user_id', uId);
      setUserId(uId);
    }
    if (sId) {
      setSessionId(sId);
      localStorage.setItem('nm_session_id', sId);
    }
    if (m) setMode(m);
    if (mp) setModelProvider(mp);
  }, []);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (mode) params.set('mode', mode);
    if (sessionId && mode === 'chat') params.set('session', sessionId);
    else params.delete('session');
    if (workspaceId) params.set('workspace', workspaceId);
    if (modelProvider) params.set('model', modelProvider);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [mode, sessionId, modelProvider]);

  useEffect(() => {
    if (userId) {
      // Fetch user profile and workspaces
      fetch(`/api/users/${userId}`)
        .then(res => res.json())
        .then(data => {
          setUser(data);
          if (data.workspaces) {
            setWorkspaces(data.workspaces);
            if (!workspaceId && data.workspaces.length > 0) {
              const firstId = data.workspaces[0].id;
              setWorkspaceId(firstId);
              localStorage.setItem('nm_workspace_id', firstId);
            }
          }
        })
        .catch(() => {});

      fetchSessions();
    }
  }, [userId, workspaceId]);

  useEffect(() => {
    if (workspaceId) {
      setSelectedDoc(null);
    }
  }, [workspaceId]);

  const changeSession = (id) => {
    setSessionId(id);
    localStorage.setItem('nm_session_id', id);
    setMode('chat');
  };

  const newSession = () => {
    const id = "nm-" + Math.random().toString(36).slice(2, 9);
    changeSession(id);
  };

  const deleteSession = async (id) => {
    try {
      await fetch(`/api/chat/${id}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== id));
      if (sessionId === id) {
        setSessionId('default');
        localStorage.setItem('nm_session_id', 'default');
      }
      showToast('Chat session deleted successfully', 'success');
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Failed to delete chat', 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  if (!userId) {
    return (
      <Onboarding
        showToast={showToast}
        onComplete={(uId, wsId) => {
          localStorage.setItem('nm_user_id', uId);
          localStorage.setItem('nm_workspace_id', wsId);
          setUserId(uId);
          setWorkspaceId(wsId);
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <Header
        user={user}
        workspaceId={workspaceId}
        workspaces={workspaces}
        setWorkspaceId={(id) => {
          setWorkspaceId(id);
          localStorage.setItem('nm_workspace_id', id);
        }}
        useGmail={useGmail}
        setUseGmail={setUseGmail}
        useCalendar={useCalendar}
        setUseCalendar={setUseCalendar}
        modelProvider={modelProvider}
        setModelProvider={setModelProvider}
        openSettings={() => setSettingsOpen(true)}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        selectedDoc={selectedDoc}
        setSelectedDoc={handleDocumentSelect}
      />

      {settingsOpen && (
        <SettingsModal 
          userId={userId} 
          showToast={showToast}
          onClose={() => setSettingsOpen(false)} 
        />
      )}

      <div 
        className={`app-body ${sidebarOpen ? 'sidebar-on' : ''}`}
        onClick={(e) => {
          if (sidebarOpen && e.target.classList.contains('app-body')) setSidebarOpen(false);
        }}
      >
        <Sidebar 
          sessions={sessions}
          currentSessionId={sessionId}
          isLoading={isSessionsLoading}
          onSessionSelect={(id) => { changeSession(id); setSidebarOpen(false); }}
          onNewSession={() => { newSession(); setSidebarOpen(false); }}
          onSessionDelete={deleteSession}
          onPromptSelect={(text) => { setMode('chat'); setQuickPrompt(text); setSidebarOpen(false); }} 
        />

        <div className="main-content">
          <div className="mode-tabs">
            <div
              className={`mode-tab ${mode === 'chat' ? 'active' : ''}`}
              onClick={() => setMode('chat')}
            >
              <span className="tab-icon">💬</span> Chat
            </div>
            <div
              className={`mode-tab ${mode === 'agent' ? 'active' : ''}`}
              onClick={() => setMode('agent')}
            >
              <span className="tab-icon">🤖</span> Agent
            </div>

            {selectedDoc && (
              <div className="selected-doc-badge-tabs">
                <FileText size={14} className='icon-doc' />
                <span className="doc-title">Chatting with: <strong>{selectedDoc.title}</strong></span>
                <button onClick={() => setSelectedDoc(null)} className="close-doc-btn"><CloseIcon size={12} /></button>
              </div>
            )}
          </div>

          {mode === 'chat' && (
            <ChatView
              user={user}
              workspaceId={workspaceId}
              userId={userId}
              sessionId={sessionId}
              modelProvider={modelProvider}
              useGmail={useGmail}
              useCalendar={useCalendar}
              quickPrompt={quickPrompt}
              showToast={showToast}
              onMessageSent={fetchSessions}
              selectedDoc={selectedDoc}
              setSelectedDoc={handleDocumentSelect}
            />
          )}
          {mode === 'agent' && (
            <AgentView
              workspaceId={workspaceId}
              userId={userId}
              modelProvider={modelProvider}
              showToast={showToast}
            />
          )}
        </div>
      </div>
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}
