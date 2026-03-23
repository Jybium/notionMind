import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  Layers,
  ChevronDown,
  Plus,
  Search,
  Command,
  HelpCircle,
  Bell,
  Sparkles,
  Menu,
  X,
  Mail,
  Calendar,
  Zap,
  Bot,
  FileText
} from 'lucide-react';
import './Header.css';

export default function Header({
  user,
  workspaceId,
  workspaces = [],
  setWorkspaceId,
  useGmail,
  setUseGmail,
  useCalendar,
  setUseCalendar,
  openSettings,
  sidebarOpen,
  setSidebarOpen,
  modelProvider,
  setModelProvider,
  selectedDoc,
  setSelectedDoc,
}) {
  const [showWS, setShowWS] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const activeWS = workspaces.find(w => w.id === workspaceId) || workspaces[0];

  const connectNotion = () => {
    window.location.href = `/api/auth/notion?userId=${localStorage.getItem('nm_user_id')}`;
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowWS(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    // Cmd/Ctrl + K shortcut
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Handle Search Fetch and Preload Recent Pages
  useEffect(() => {
    if (!workspaceId || !isSearchOpen) {
      setSearchResults([]);
      return;
    }

    if (!searchQuery.trim()) {
      setIsSearching(true);
      fetch(`/api/workspaces/${workspaceId}/pages`)
        .then(res => res.json())
        .then(data => {
          setSearchResults(data);
        })
        .catch(err => console.error('Recent pages error:', err))
        .finally(() => setIsSearching(false));
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, workspaceId, isSearchOpen]);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="logo-section" onClick={() => window.location.href = '/'} title="Back to Home">
          <div className="logo-mark">🧠</div>
          <span className="logo-name">NotionMind</span>
        </div>

        <div className="header-sep" />

        <div className="workspace-switcher" ref={dropdownRef}>
          <div className={`ws-active-pill ${showWS ? 'open' : ''}`} onClick={() => setShowWS(!showWS)}>
            <div className="ws-icon-wrap">
              <Layers size={14} />
            </div>
            <span className="ws-name">{activeWS?.name || 'Workspace'}</span>
            <ChevronDown size={14} className="ws-arrow" />
          </div>

          {showWS && (
            <div className="ws-dropdown">
              <div className="dropdown-label">Workspaces</div>
              <div className="ws-list">
                {workspaces.map(ws => (
                  <div
                    key={ws.id}
                    className={`ws-item ${ws.id === workspaceId ? 'active' : ''}`}
                    onClick={() => { setWorkspaceId(ws.id); setShowWS(false); }}
                  >
                    <div className="ws-item-icon">
                      {ws.id === workspaceId ? <div className="ws-dot active" /> : <div className="ws-dot" />}
                    </div>
                    <span>{ws.name}</span>
                  </div>
                ))}
              </div>
              <div className="dropdown-divider" />
              <button className="add-ws-btn" onClick={connectNotion}>
                <Plus size={14} /> <span>Connect Space</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="header-center">
        <div className="search-bar-trigger" onClick={() => setIsSearchOpen(true)}>
          <Search size={14} className="search-icon" />
          <span className="search-text">Search or ask anything...</span>
          <div className="search-shortcut">
            <Command size={10} /> K
          </div>
        </div>
      </div>

      <div className="header-right">
        <div className="status-indicators">
          <div
            className={`status-pill ${useGmail ? 'active' : ''}`}
            onClick={() => setUseGmail(!useGmail)}
            title={useGmail ? 'Gmail Connected' : 'Gmail Off'}
          >
            <Mail size={14} />
          </div>
          <div
            className={`status-pill ${useCalendar ? 'active' : ''}`}
            onClick={() => setUseCalendar(!useCalendar)}
            title={useCalendar ? 'Calendar Connected' : 'Calendar Off'}
          >
            <Calendar size={14} />
          </div>

          <div className="header-sep-tiny" />

          <div
            className="model-selector-pill"
            onClick={() => setModelProvider(modelProvider === 'claude' ? 'gemini' : 'claude')}
            title={`Current Model: ${modelProvider === 'claude' ? 'Claude 3.5' : 'Gemini 2.5'}`}
          >
            <div className={`${modelProvider}`}>
              {modelProvider === 'claude' ? <Zap size={11} /> : <span>🧠</span>}
            </div>
            <span className="model-name">{modelProvider === 'claude' ? 'Claude' : 'Gemini'}</span>
          </div>
        </div>

        <div className="header-sep" />

        <div className="header-actions">
          <button className="icon-action" onClick={openSettings} title="Settings">
            <Settings size={18} />
          </button>
          <button className="icon-action" title="Notifications">
            <Bell size={18} />
          </button>
        </div>

        <div className="user-profile">
          <div className="user-avatar" title={user?.email || 'User Profile'}>
            {user?.profileImage ? (
              <img src={user.profileImage} alt={user?.name} className="avatar-img" />
            ) : (
              getInitials(user?.name)
            )}
            <div className={`user-status-dot ${user ? 'online' : ''}`} />
          </div>
        </div>
      </div>

      {isSearchOpen && (
        <div className="command-palette-overlay">
          <div className="command-palette" ref={searchRef}>
            <div className="search-input-wrap">
              <Search size={18} className="palette-search-icon" />
              <input
                autoFocus
                type="text"
                placeholder="Search documents in this workspace..."
                className="palette-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="palette-esc">ESC</div>
            </div>

            <div className="palette-results">
              {isSearching ? (
                <div className="palette-loading">Searching Notion...</div>
              ) : searchQuery && searchResults.length === 0 ? (
                <div className="palette-empty">No matching pages found</div>
              ) : (
                searchResults.map(page => (
                  <div
                    key={page.id}
                    className="palette-item"
                    onClick={() => {
                      setSelectedDoc(page);
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                  >
                    <FileText size={16} className="palette-item-icon" />
                    <div className="palette-item-info">
                      <div className="palette-item-title">{page.title}</div>
                      <div className="palette-item-meta">Notion Page</div>
                    </div>
                  </div>
                ))
              )}

              {!searchQuery && searchResults.length === 0 && !isSearching && (
                <div className="palette-empty">Type to search your workspace</div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
