import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const STEPS = [
  // Properties
  { target: '[data-tour-id="sidebar-properties"]', title: 'Step 1: Properties', text: 'Click here to go to Properties.', advanceOn: 'route', route: '/properties' },
  { target: '#add-property-btn', title: 'Add Property', text: 'Click this button to add your first demo property.', advanceOn: 'click' },
  { target: '.modal-content', title: 'Create Property', text: 'Fill out the demo details and click Save.', advanceOn: 'manual' },
  // Units
  { target: '[data-tour-id="sidebar-units"]', title: 'Step 2: Units', text: 'Now let\'s add a unit to your property.', advanceOn: 'route', route: '/units' },
  { target: '#add-unit-btn', title: 'Add Unit', text: 'Click here to create a unit.', advanceOn: 'click' },
  { target: '.modal-content', title: 'Create Unit', text: 'Fill out the unit details and save.', advanceOn: 'manual' },
  // Occupants
  { target: '[data-tour-id="sidebar-occupants"]', title: 'Step 3: Occupants', text: 'Let\'s register a demo occupant.', advanceOn: 'route', route: '/occupants' },
  { target: '#add-occupant-btn', title: 'Add Occupant', text: 'Click here to add an occupant.', advanceOn: 'click' },
  { target: '.modal-content', title: 'Create Occupant', text: 'Enter the details and save.', advanceOn: 'manual' },
  // Agreements
  { target: '[data-tour-id="sidebar-agreements"]', title: 'Step 4: Agreements', text: 'Finally, create a lease or reservation.', advanceOn: 'route', route: '/agreements' },
  { target: '#add-agreement-btn', title: 'Add Agreement', text: 'Click here to tie the occupant to the unit.', advanceOn: 'click' },
  { target: '.modal-content', title: 'Create Agreement', text: 'Fill out the agreement and save to complete the tour!', advanceOn: 'manual' },
];

export default function OnboardingTour() {
  const { onboarding, advanceOnboarding, completeOnboarding } = useAuthStore();
  const location = useLocation();
  const [targetRect, setTargetRect] = useState(null);
  
  const tooltipRef = useRef(null);

  const isActive = onboarding?.isActive;
  const currentStep = onboarding?.step || 0;
  
  // 1. Auto-advance on Route Change
  useEffect(() => {
    if (!isActive || currentStep >= STEPS.length) return;
    const current = STEPS[currentStep];
    if (current.advanceOn === 'route' && location.pathname.startsWith(current.route)) {
      advanceOnboarding();
    }
  }, [location.pathname, isActive, currentStep, advanceOnboarding]);

  // 2. Continuous Tracking of Target Element
  useEffect(() => {
    if (!isActive || currentStep >= STEPS.length) return;
    
    const updateTargetPosition = () => {
      const current = STEPS[currentStep];
      const el = document.querySelector(current.target);
      
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
        
        // Only scroll if it's offscreen and not a modal
        if (current.target !== '.modal-content') {
            const inViewport = (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
            if (!inViewport) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            }
        }
      } else {
        setTargetRect(null);
      }
    };

    updateTargetPosition();
    const interval = setInterval(updateTargetPosition, 200);
    window.addEventListener('resize', updateTargetPosition);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateTargetPosition);
    };
  }, [isActive, currentStep]);

  // 3. Handle Auto-advance on Click
  useEffect(() => {
    if (!isActive || currentStep >= STEPS.length) return;
    const current = STEPS[currentStep];
    
    if (current.advanceOn === 'click') {
      const handleClick = (e) => {
        const el = document.querySelector(current.target);
        if (el && el.contains(e.target)) {
          advanceOnboarding();
        }
      };
      document.addEventListener('click', handleClick, true); // capture phase
      return () => document.removeEventListener('click', handleClick, true);
    }
  }, [isActive, currentStep, advanceOnboarding]);

  // Finish tour if all steps complete
  useEffect(() => {
    if (isActive && currentStep >= STEPS.length) {
      completeOnboarding();
    }
  }, [isActive, currentStep, completeOnboarding]);

  if (!isActive || currentStep >= STEPS.length) return null;

  const current = STEPS[currentStep];

  return (
    <div style={{ position: 'fixed', zIndex: 9999, inset: 0, pointerEvents: 'none' }}>
      
      {/* 4-div Blocker for strict click enforcement */}
      {targetRect ? (
        <>
          <div className="tour-blocker" style={{ top: 0, left: 0, right: 0, height: Math.max(0, targetRect.top - 8) }} />
          <div className="tour-blocker" style={{ top: targetRect.top - 8 + targetRect.height + 16, left: 0, right: 0, bottom: 0 }} />
          <div className="tour-blocker" style={{ top: Math.max(0, targetRect.top - 8), height: targetRect.height + 16, left: 0, width: Math.max(0, targetRect.left - 8) }} />
          <div className="tour-blocker" style={{ top: Math.max(0, targetRect.top - 8), height: targetRect.height + 16, left: targetRect.left - 8 + targetRect.width + 16, right: 0 }} />
          
          {/* Highlight ring around target */}
          <div style={{
            position: 'absolute',
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            border: '2px dashed var(--accent-primary)',
            borderRadius: 8,
            pointerEvents: 'none'
          }} />
        </>
      ) : (
        <div className="tour-blocker" style={{ inset: 0 }} />
      )}
      
      {/* Tooltip */}
      <div 
        ref={tooltipRef}
        className="tour-tooltip"
        style={targetRect ? {
          top: targetRect.top + targetRect.height + 24 > window.innerHeight - 200 
                ? Math.max(16, targetRect.top - 180) // display above if near bottom
                : targetRect.top + targetRect.height + 24, 
          left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 320))
        } : {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div className="tour-header">
          <span className="tour-step-counter">Step {currentStep + 1} of {STEPS.length}</span>
          <button onClick={completeOnboarding} className="tour-close" style={{ pointerEvents: 'auto' }}><X size={16} /></button>
        </div>
        
        <h3 className="tour-title">{current.title}</h3>
        <p className="tour-text">{current.text}</p>
        
        <div className="tour-footer">
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={completeOnboarding}
            style={{ padding: '6px 0', fontSize: '0.8rem', border: 'none', pointerEvents: 'auto' }}
          >
            Skip Tour
          </button>
          {current.advanceOn === 'manual' && (
             <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontStyle: 'italic' }}>Waiting for you to save...</span>
          )}
        </div>
      </div>
    </div>
  );
}
