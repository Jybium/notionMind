import React, { useState, useEffect, useRef } from 'react';
import './CommandPalette.css';

export default function CommandPalette({ onClose, onCommand }) {
  const [query, setQuery] = useState('');
  const [commands, setCommands] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    fetch(`/api/commands?q=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(cmds => {
        setCommands(cmds);
        setSelectedIndex(0);
      });
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(Math.min(selectedIndex + 1, commands.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(Math.max(selectedIndex - 1, 0));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (commands[selectedIndex]) {
           onCommand(commands[selectedIndex]);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, commands, onClose, onCommand]);

  const byCategory = commands.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {});

  let globalIdx = 0;

  return (
    <div className="palette-overlay open" onClick={(e) => e.target.className.includes('palette-overlay') && onClose()}>
      <div className="palette-box">
        <div className="palette-input-row">
          <span className="palette-icon">⌘</span>
          <input 
            ref={inputRef}
            className="palette-input" 
            placeholder="Search commands, actions, agents…" 
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="palette-results">
          {commands.length === 0 ? (
            <div className="palette-empty">No commands found</div>
          ) : (
            Object.entries(byCategory).map(([cat, items]) => (
              <React.Fragment key={cat}>
                <div className="palette-category">{cat}</div>
                {items.map(item => {
                  const currentIdx = globalIdx++;
                  return (
                    <div 
                      key={item.id} 
                      className={`palette-item ${currentIdx === selectedIndex ? 'selected' : ''}`}
                      onClick={() => onCommand(item)}
                    >
                      <span className="palette-item-icon">{item.icon}</span>
                      <span className="palette-item-label">{item.label}</span>
                      {item.special === 'agent' && <span className="palette-item-badge agent">agent</span>}
                      {item.special === 'pdf' && <span className="palette-item-badge pdf">export</span>}
                    </div>
                  )
                })}
              </React.Fragment>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
