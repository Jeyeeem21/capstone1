import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, User, Lock, Eye, EyeOff, Loader2, Check, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';
import Button from './Button';
import { authApi } from '../../api';

const LoginModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({ email: '', password: '' });
      setTouched({ email: false, password: false });
      setError('');
      setSubmitted(false);
      setShakeKey(0);
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Validation helpers
  const getFieldStatus = (field) => {
    const value = formData[field]?.trim();
    const isTouched = touched[field];
    const isSubmittedEmpty = submitted && !value;
    
    if (isSubmittedEmpty || (isTouched && !value)) {
      return 'error';
    }
    if (value) {
      return 'success';
    }
    return 'default';
  };

  const getFieldError = (field) => {
    const value = formData[field]?.trim();
    const isTouched = touched[field];
    
    if ((submitted || isTouched) && !value) {
      return field === 'email' ? 'Email is required' : 'Password is required';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);

    // Check if any required field is empty
    const hasEmptyFields = !formData.email?.trim() || !formData.password?.trim();
    
    if (hasEmptyFields) {
      setShakeKey(prev => prev + 1);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Use the authApi for login
      const response = await authApi.login({
        email: formData.email,
        password: formData.password,
        remember: false,
      });
      
      if (response.success) {
        onClose();
        navigate('/admin/dashboard');
      } else {
        setError(response.error || 'Invalid email or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ email: '', password: '' });
    setTouched({ email: false, password: false });
    setError('');
    setSubmitted(false);
    onClose();
  };

  // Input styling based on status (matching FormInput from admin)
  const getInputClassName = (field, hasLeftIcon = false, hasRightIcon = false) => {
    const status = getFieldStatus(field);
    const shouldShake = submitted && !formData[field]?.trim();
    
    const baseClasses = `w-full py-3 text-sm border-2 rounded-xl transition-all shadow-sm focus:outline-none focus:ring-4`;
    const paddingClasses = `${hasLeftIcon ? 'pl-10' : 'px-4'} ${hasRightIcon ? 'pr-12' : 'pr-10'}`;
    
    const statusClasses = {
      error: 'border-red-400 bg-red-50/50 focus:border-red-500 focus:ring-red-500/20',
      success: 'border-green-400 bg-green-50/30 focus:border-green-500 focus:ring-green-500/20',
      default: 'border-primary-300 bg-white hover:border-primary-400 focus:border-primary-500 focus:ring-primary-500/20'
    };

    return `${baseClasses} ${paddingClasses} ${statusClasses[status]} ${shouldShake ? 'animate-shake' : ''}`;
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Login to KJP Ricemill"
      size="sm"
    >
      <form onSubmit={handleSubmit} className={`space-y-4 ${shakeKey > 0 ? 'animate-shake' : ''}`} key={shakeKey} noValidate>
        {/* Logo/Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-button-500 to-button-600 rounded-xl flex items-center justify-center shadow-lg shadow-button-500/25">
            <LogIn size={28} className="text-white" />
          </div>
        </div>

        {/* Welcome Text */}
        <div className="text-center mb-4">
          <p className="text-gray-600">Welcome back! Please login to your account.</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border-2 border-red-200 text-red-600 text-sm rounded-xl flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Email Field */}
        <div className="mb-4">
          <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
            Email Address
            <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={() => handleBlur('email')}
              placeholder="admin@kjpricemill.com"
              className={getInputClassName('email', true, false)}
            />
            {/* Status Icon */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {getFieldStatus('email') === 'error' && <AlertCircle size={18} className="text-red-500" />}
              {getFieldStatus('email') === 'success' && <Check size={18} className="text-green-500" />}
            </div>
          </div>
          {getFieldError('email') && (
            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={12} />
              {getFieldError('email')}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="mb-4">
          <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-2">
            Password
            <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={() => handleBlur('password')}
              placeholder="Enter your password"
              className={getInputClassName('password', true, true)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {/* Status Icon */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {getFieldStatus('password') === 'error' && <AlertCircle size={18} className="text-red-500" />}
              {getFieldStatus('password') === 'success' && <Check size={18} className="text-green-500" />}
            </div>
          </div>
          {getFieldError('password') && (
            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={12} />
              {getFieldError('password')}
            </p>
          )}
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 text-button-600 border-primary-300 rounded focus:ring-button-500" />
            <span className="text-gray-600">Remember me</span>
          </label>
          <button type="button" className="text-button-600 hover:text-button-700 font-medium">
            Forgot Password?
          </button>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full py-3"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            <>
              <LogIn size={18} className="mr-2" />
              Login
            </>
          )}
        </Button>
      </form>
    </Modal>
  );
};

export default LoginModal;
