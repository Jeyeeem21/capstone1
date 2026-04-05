import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Keyboard } from 'lucide-react';
import Button from './Button';

// Helper: reset body scroll lock styles
const resetBodyStyles = () => {
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
};

// Helper: get all focusable input fields within a container
const getFocusableInputs = (container) => {
  if (!container) return [];
  return Array.from(container.querySelectorAll(
    'input:not([type="hidden"]):not([disabled]):not([type="file"]), select:not([disabled]), textarea:not([disabled])'
  )).filter(el => el.offsetParent !== null); // visible only
};

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  footer = null,
}) => {
  const modalRef = useRef(null);
  const scrollPositionRef = useRef(0);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (showShortcuts) {
          setShowShortcuts(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, showShortcuts]);

  // Reset shortcut help when modal closes
  useEffect(() => {
    if (!isOpen) setShowShortcuts(false);
  }, [isOpen]);

  const overlayRef = useRef(null);

  // Prevent body scroll when modal is open - preserve scroll position
  useEffect(() => {
    if (isOpen) {
      scrollPositionRef.current = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPositionRef.current}px`;
      document.body.style.width = '100%';
    } else {
      resetBodyStyles();
      window.scrollTo(0, scrollPositionRef.current);
    }
    return () => {
      resetBodyStyles();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-[90vw]',
  };

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div 
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={handleOverlayClick}
    >
      <div 
        ref={modalRef}
        className={`${sizes[size]} w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl transform transition-all animate-slideUp border-2 border-primary-300 dark:border-primary-700 relative`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-primary-200 dark:border-primary-700 bg-gradient-to-r from-primary-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowShortcuts(v => !v)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard size={16} />
            </button>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 dark:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Keyboard shortcuts overlay */}
        {showShortcuts && (
          <div className="absolute inset-0 z-10 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2"><Keyboard size={20} /> Keyboard Shortcuts</h3>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {[
                ['Esc', 'Close modal'],
                ['Ctrl + S', 'Save / Submit'],
                ['Enter', 'Next input field'],
                ['Ctrl + Backspace', 'Clear current field'],
                ['Ctrl + Shift + Backspace', 'Clear all fields'],
                ['Ctrl + Enter', 'Confirm action'],
              ].map(([key, desc]) => (
                <div key={key} className="contents">
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono font-semibold text-gray-700 dark:text-gray-200 text-right whitespace-nowrap">{key}</kbd>
                  <span className="text-gray-600 dark:text-gray-300 py-1">{desc}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowShortcuts(false)} className="mt-5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors">Got it</button>
          </div>
        )}

        {/* Content */}
        <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-3 border-t-2 border-primary-200 dark:border-primary-700 bg-primary-50/30 dark:bg-gray-700/30 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

// Confirm Modal for delete operations
const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  icon: Icon = null,
  isLoading = false,
}) => {
  // Enter or Ctrl+Enter to confirm
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey)) || (e.key === 'Enter' && !e.target.closest('input, textarea, select'))) {
        e.preventDefault();
        if (!isLoading && onConfirm) onConfirm();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, isLoading, onConfirm]);
  const variants = {
    danger: { iconBg: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600 dark:text-red-400', buttonVariant: 'danger' },
    warning: { iconBg: 'bg-yellow-100 dark:bg-yellow-900/30', iconColor: 'text-yellow-600 dark:text-yellow-400', buttonVariant: 'warning' },
    info: { iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400', buttonVariant: 'info' },
    success: { iconBg: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400', buttonVariant: 'success' },
    primary: { iconBg: 'bg-button-100 dark:bg-button-900/30', iconColor: 'text-button-600 dark:text-button-400', buttonVariant: 'primary' },
  };

  const variantStyle = variants[variant] || variants.danger;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="text-center py-4">
        {Icon && (
          <div className={`w-16 h-16 ${variantStyle.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <Icon size={32} className={variantStyle.iconColor} />
          </div>
        )}
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button variant={variantStyle.buttonVariant} onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Form Modal wrapper
const FormModal = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  children,
  submitText = 'Save',
  cancelText = 'Cancel',
  size = 'md',
  isLoading = false,
  loading = false, // alias for isLoading
  submitDisabled = false,
}) => {
  const isDisabled = isLoading || loading;
  const isSubmitDisabled = isDisabled || submitDisabled;
  const [submitted, setSubmitted] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const formRef = useRef(null);

  // Keyboard shortcuts for form modals
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      const form = formRef.current || document.getElementById('modal-form');

      // Ctrl+S or Ctrl+Enter → submit form
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'Enter')) {
        e.preventDefault();
        if (!isSubmitDisabled && form) {
          form.requestSubmit();
        }
        return;
      }

      // Ctrl+Shift+Backspace → clear all form fields
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Backspace') {
        e.preventDefault();
        if (form) {
          const inputs = getFocusableInputs(form);
          inputs.forEach(input => {
            if (input.tagName === 'SELECT') {
              input.selectedIndex = 0;
            } else {
              // Use native setter to trigger React's onChange
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
                'value'
              )?.set;
              if (nativeInputValueSetter) {
                nativeInputValueSetter.call(input, '');
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }
          });
          // Focus first input after clearing
          if (inputs[0]) inputs[0].focus();
        }
        return;
      }

      // Ctrl+Backspace → clear focused input field
      if ((e.ctrlKey || e.metaKey) && e.key === 'Backspace' && !e.shiftKey) {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') && active.closest('.fixed, [role="dialog"]')) {
          e.preventDefault();
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            active.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
            'value'
          )?.set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(active, '');
            active.dispatchEvent(new Event('input', { bubbles: true }));
            active.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        return;
      }

      // Enter on input (not textarea, not button) → move to next field
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const active = document.activeElement;
        if (active && active.tagName === 'INPUT' && active.type !== 'submit' && active.type !== 'button' && form) {
          e.preventDefault();
          const inputs = getFocusableInputs(form);
          const idx = inputs.indexOf(active);
          if (idx >= 0 && idx < inputs.length - 1) {
            inputs[idx + 1].focus();
          } else if (idx === inputs.length - 1) {
            // Last field → submit
            form.requestSubmit();
          }
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, isSubmitDisabled]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitDisabled) return; // Prevent double submission
    setSubmitted(true);
    
    // Get all form inputs that have 'required' attribute or data-required
    const form = e.target;
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    
    // Check if any required field is empty
    let hasEmptyRequired = false;
    inputs.forEach(input => {
      const value = input.value?.toString().trim();
      if (!value) {
        hasEmptyRequired = true;
        // Add shake class to empty inputs
        input.classList.add('animate-shake');
        setTimeout(() => input.classList.remove('animate-shake'), 500);
      }
    });
    
    // Only proceed if all required fields have values
    if (hasEmptyRequired) {
      // Trigger form shake by updating key
      setShakeKey(prev => prev + 1);
      return; // Don't proceed with submission
    }
    
    try {
      await onSubmit(e);
      // Only reset submitted state if submission was successful
      setSubmitted(false);
    } catch (error) {
      // Keep submitted=true so validation errors stay visible
      console.log('Form submission failed, keeping validation visible');
    }
  };
  
  // Reset submitted state when modal closes
  const handleClose = () => {
    if (isDisabled) return; // Prevent closing while saving
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={title}
      size={size}
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleClose} disabled={isDisabled}>
            {cancelText}
          </Button>
          <Button type="submit" form="modal-form" disabled={isSubmitDisabled}>
            {isDisabled ? 'Saving...' : submitText}
          </Button>
        </div>
      }
    >
      <form 
        id="modal-form"
        ref={formRef}
        onSubmit={handleSubmit} 
        noValidate
        key={shakeKey}
        className={shakeKey > 0 ? 'animate-shake' : ''}
      >
        {typeof children === 'function' ? children({ submitted }) : children}
      </form>
    </Modal>
  );
};

export { Modal, ConfirmModal, FormModal };
export default Modal;
