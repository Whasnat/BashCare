import { useState, useEffect, useRef } from 'react';
import { ChevronRight, X, ChevronLeft, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';

const LANDLORD_STEPS = [
  { id: 'sidebar-properties', title: 'Start Here', text: 'Add your first property (apartment building, hotel, etc.) to get started.' },
  { id: 'sidebar-units', title: 'Create Units', text: 'Then add units (rooms, shops, beds) inside your property.' },
  { id: 'sidebar-occupants', title: 'Register Occupants', text: 'Register your tenants, guests, or patients here.' },
  { id: 'sidebar-agreements', title: 'Create Agreements', text: 'Create leases or booking agreements to link occupants to units.' },
  { id: 'sidebar-billing', title: 'Monthly Billing', text: 'Generate invoices automatically based on your agreements.' },
  { id: 'sidebar-payments', title: 'Record Payments', text: 'Track and verify payments from your occupants.' },
  { id: 'topbar-theme', title: 'Customize View', text: 'Switch between Dark, Light, and System themes.' },
  { id: 'dashboard-actions', title: 'Quick Actions', text: 'Use these shortcuts on your dashboard to work faster. You\'re all set!' }
];

const TENANT_STEPS = [
  { id: 'tenant-dashboard', title: 'Your Dashboard', text: 'See your rent and outstanding balance at a glance.' },
  { id: 'tenant-invoices', title: 'My Invoices', text: 'View and pay your monthly invoices.' },
  { id: 'tenant-maintenance', title: 'Maintenance', text: 'Submit repair requests directly to your landlord.' }
];

export default function OnboardingTour({ role }) {
  const { user, onboardingComplete, completeOnboarding } = useAuthStore();
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const steps = role === 'tenant' || role === 'TENANT' ? TENANT_STEPS : LANDLORD_STEPS;
  
  const tooltipRef = useRef(null);
  
  console.log('OnboardingTour render:', { role, onboardingComplete, currentStep });

  useEffect(() => {
    if (onboardingComplete) return;
    
    // Add a small delay to let the DOM render (especially the sidebar and dashboard)
    const timer = setTimeout(updateTargetPosition, 500);
    window.addEventListener('resize', updateTargetPosition);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTargetPosition);
    };
  }, [currentStep, onboardingComplete]);

  const updateTargetPosition = () => {
    if (currentStep >= steps.length) return;
    
    const stepId = steps[currentStep].id;
    const el = document.querySelector(`[data-tour-id="${stepId}"]`);
    
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      // Scroll into view if needed
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    } else {
      // Element not found on screen, might be in a different route or hidden
      setTargetRect(null);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    }
  };

  const handleComplete = () => {
    completeOnboarding();
  };

  // DEBUG: Force show
  // if (onboardingComplete || currentStep >= steps.length) return null;
  if (currentStep >= steps.length) return null;

  const current = steps[currentStep];

  return (
    <div className="tour-overlay">
      {/* Backdrop cutout */}
      {targetRect && (
        <div 
          className="tour-cutout"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}
      
      {/* Tooltip positioned relative to target or centered if target not found */}
      <div 
        ref={tooltipRef}
        className="tour-tooltip"
        style={targetRect ? {
          top: targetRect.top + targetRect.height + 24 > window.innerHeight - 200 
                ? targetRect.top - 180 // display above if near bottom
                : targetRect.top + targetRect.height + 24, 
          left: Math.max(20, Math.min(targetRect.left, window.innerWidth - 320))
        } : {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div className="tour-header">
          <span className="tour-step-counter">Step {currentStep + 1} of {steps.length}</span>
          <button onClick={handleComplete} className="tour-close"><X size={16} /></button>
        </div>
        
        <h3 className="tour-title">{current.title}</h3>
        <p className="tour-text">{current.text}</p>
        
        <div className="tour-footer">
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={handleComplete}
            style={{ padding: '6px 0', fontSize: '0.8rem', border: 'none' }}
          >
            Skip Tour
          </button>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              className="btn btn-secondary btn-sm btn-icon" 
              onClick={handlePrev} 
              disabled={currentStep === 0}
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={handleNext}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {currentStep === steps.length - 1 ? (
                <>Finish <Check size={14} /></>
              ) : (
                <>Next <ChevronRight size={14} /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
