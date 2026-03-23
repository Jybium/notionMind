import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X, Info, Zap } from 'lucide-react';
import './Toast.css';

export default function Toast({ message, type = 'success', onClose, duration = 5000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const Icon = type === 'success' ? CheckCircle : type === 'error' ? AlertCircle : Info;

  return (
    <div className={`toast-container ${type}`}>
      <div className="toast-icon">
        <Icon size={18} />
      </div>
      <div className="toast-content">
        <div className="toast-message">{message}</div>
      </div>
      <button className="toast-close" onClick={onClose}>
        <X size={14} />
      </button>
      {/* <div className="toast-progress-bar" style={{ animationDuration: `${duration}ms` }} /> */}
    </div>
  );
}
