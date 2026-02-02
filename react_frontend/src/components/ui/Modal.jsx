import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from './Button';

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

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open - preserve scroll position
  useEffect(() => {
    if (isOpen) {
      scrollPositionRef.current = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPositionRef.current}px`;
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollPositionRef.current);
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={handleOverlayClick}
    >
      <div 
        ref={modalRef}
        className={`${sizes[size]} w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl transform transition-all animate-slideUp border-2 border-primary-300`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-primary-200 bg-gradient-to-r from-primary-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h2>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-5 max-h-[calc(90vh-180px)] overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t-2 border-primary-200 bg-primary-50/30 dark:bg-gray-700/30 rounded-b-2xl">
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
  const variants = {
    danger: { iconBg: 'bg-red-100', iconColor: 'text-red-600', buttonVariant: 'danger' },
    warning: { iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600', buttonVariant: 'warning' },
    info: { iconBg: 'bg-blue-100', iconColor: 'text-blue-600', buttonVariant: 'info' },
    success: { iconBg: 'bg-green-100', iconColor: 'text-green-600', buttonVariant: 'success' },
    primary: { iconBg: 'bg-button-100', iconColor: 'text-button-600', buttonVariant: 'primary' },
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
        <p className="text-gray-600 mb-6">{message}</p>
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
}) => {
  const isDisabled = isLoading || loading;
  const [submitted, setSubmitted] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isDisabled) return; // Prevent double submission
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
          <Button type="submit" form="modal-form" disabled={isDisabled}>
            {isDisabled ? 'Saving...' : submitText}
          </Button>
        </div>
      }
    >
      <form 
        id="modal-form" 
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
