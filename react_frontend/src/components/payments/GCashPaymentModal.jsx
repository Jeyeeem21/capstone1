import { useState } from 'react';
import { Smartphone, Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui';

const GCashPaymentModal = ({ amount, onSubmit, onCancel }) => {
  const [referenceNumber, setReferenceNumber] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [shake, setShake] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, proof: 'Please upload an image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, proof: 'Image must be less than 5MB' });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setProofImage(reader.result);
      setProofPreview(URL.createObjectURL(file));
      setErrors({ ...errors, proof: null });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setProofImage(null);
    setProofPreview(null);
  };

  const validate = () => {
    const newErrors = {};
    if (!referenceNumber.trim()) {
      newErrors.reference = 'Reference number is required';
    }
    if (!proofImage) {
      newErrors.proof = 'Proof of payment is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    onSubmit({
      payment_method: 'gcash',
      amount,
      reference_number: referenceNumber,
      proof_image: proofImage
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        .shake-modal {
          animation: shake 0.5s;
        }
      `}</style>
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto ${shake ? 'shake-modal' : ''}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Smartphone size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">GCash Payment</h3>
                <p className="text-blue-100 text-sm">Upload proof of payment</p>
              </div>
            </div>
            <button onClick={onCancel} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Amount Display */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Amount to Pay</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ₱{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              GCash Reference Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g., GC123456789"
              className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.reference ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500'
              }`}
            />
            {errors.reference && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.reference}
              </p>
            )}
          </div>

          {/* Proof Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Proof of Payment <span className="text-red-500">*</span>
            </label>

            {!proofPreview ? (
              <label className={`block w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                errors.proof 
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }`}>
                <Upload size={32} className={`mx-auto mb-2 ${errors.proof ? 'text-red-500' : 'text-gray-400'}`} />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Click to upload screenshot
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  PNG, JPG up to 5MB
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative">
                <img
                  src={proofPreview}
                  alt="Proof preview"
                  className="w-full h-48 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600"
                />
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {errors.proof && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.proof}
              </p>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-semibold mb-1">Payment Verification</p>
                <p>Your payment will be marked as "Pending Verification" and will be verified by an admin within 24 hours.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl flex gap-3">
          <Button onClick={onCancel} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700">
            Submit Payment
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GCashPaymentModal;
