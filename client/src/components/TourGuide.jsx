import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, X, CheckCircle } from 'lucide-react';
import './TourGuide.css';

const TOUR_STEPS = [
  {
    target: '.sidebar',
    title: 'Your Command Center',
    content: 'All your chat history and quick actions live here. Access your past sessions and run automated Notion reviews with one click.',
    position: 'right'
  },
  {
    target: '.model-selector-container',
    title: 'Choose Your Intelligence',
    content: 'Switch between Gemini 3.1 Pro for deep reasoning, Flash Lite for speed, or Claude 3.5 for autonomous agent missions.',
    position: 'bottom'
  },
  {
    target: '.mode-tabs',
    title: 'Chat vs. Agent',
    content: 'Chat mode is for quick questions. Switch to Agent mode for autonomous missions that scan and organize your entire workspace.',
    position: 'bottom'
  },
  {
    target: '.document-picker-trigger',
    title: 'Focus on Documents',
    content: 'Collaborate with specific Notion pages. Select a document to give the AI context for your conversation.',
    position: 'top'
  },
  {
    target: '.quick-actions-section',
    title: 'Smart Automation',
    content: 'Use these shortcuts to search for "Forgotten Pages" or generate a Daily Review of your recently edited documents.',
    position: 'right'
  },
  {
    target: 'body',
    title: 'You\'re All Set',
    content: 'NotionMind is now your workspace core. Ready to boost your productivity?',
    position: 'center'
  }
];

export default function TourGuide({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [cardPos, setCardPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      updateSpotlight();
    };
    window.addEventListener('resize', handleResize);
    
    const timer = setTimeout(() => {
      setIsVisible(true);
      updateSpotlight();
    }, 500);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [currentStep]);

  const updateSpotlight = () => {
    const step = TOUR_STEPS[currentStep];
    if (step.target === 'body') {
      setCoords({ top: 0, left: 0, width: 0, height: 0, centered: true });
      return;
    }

    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        centered: false
      });

      // Calculate desired card position
      let top = 0;
      let left = 0;

      if (step.position === 'bottom') {
        top = rect.top + rect.height + 24;
        left = rect.left;
      } else if (step.position === 'top') {
        top = rect.top - 200 - 24; // estimate height for now
        left = rect.left;
      } else if (step.position === 'right') {
        top = rect.top;
        left = rect.left + rect.width + 24;
      }

      // Clamp to viewport
      const padding = 20;
      const cardWidth = 320;
      const cardHeight = 200; // estimated

      left = Math.max(padding, Math.min(left, window.innerWidth - cardWidth - padding));
      top = Math.max(padding, Math.min(top, window.innerHeight - cardHeight - padding));

      setCardPos({ top, left });
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const completeTour = () => {
    setIsVisible(false);
    setTimeout(() => onComplete(), 300);
  };

  if (!isVisible) return null;

  const step = TOUR_STEPS[currentStep];

  return (
    <div className="tour-overlay">
      <div 
        className="tour-spotlight" 
        style={{
          top: coords.top - 8,
          left: coords.left - 8,
          width: coords.centered ? 0 : coords.width + 16,
          height: coords.centered ? 0 : coords.height + 16,
          boxShadow: coords.centered ? 'none' : '0 0 0 9999px rgba(0, 0, 0, 0.7)'
        }}
      />
      
      <div 
        className={`tour-card ${coords.centered ? 'centered' : ''} ${isMobile ? 'mobile-sheet' : ''} pos-${step.position}`}
        style={(!coords.centered && !isMobile) ? {
          top: cardPos.top,
          left: cardPos.left
        } : {}}
      >
        <button className="tour-close" onClick={completeTour}><X size={16} /></button>
        
        <div className="tour-content">
          <div className="tour-step-indicator">Step {currentStep + 1} of {TOUR_STEPS.length}</div>
          <h3>{step.title}</h3>
          <p>{step.content}</p>
        </div>

        <div className="tour-footer">
          <button className="tour-btn-text" onClick={completeTour}>Skip Tour</button>
          <div className="tour-nav">
            {currentStep > 0 && (
              <button className="tour-btn-icon" onClick={handleBack}><ChevronLeft size={18} /></button>
            )}
            <button className="tour-btn-primary" onClick={handleNext}>
              {currentStep === TOUR_STEPS.length - 1 ? (
                <>Finish <CheckCircle size={16} style={{marginLeft: 8}} /></>
              ) : (
                <>Next <ChevronRight size={16} style={{marginLeft: 4}} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
