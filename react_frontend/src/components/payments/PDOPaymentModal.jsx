import { useState } from 'react';
import { Banknote, Upload, X, AlertCircle } from 'lucide-react';
import { Button } from '../ui';

const PDOPaymentModal = ({ amount, onSubmit, onCancel }) => {
  const [checkNumber, setCheckNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [checkImage, setCheckImage] = useState(null);
  const [checkPreview, setCheckPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [shake, setShake] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, check: 'Please upload an image file' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, check: 'Image must be less than 5MB' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCheckImage(reader.result);
      setCheckPreview(URL.createObjectURL(file));
      setErrors({ ...errors, check: null });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setCheckImage(null);
    setCheckPreview(null);
  };

  const validate = () => {
    const newErrors = {};
    if (!checkNumber.trim()) {
      newErrors.checkNumber = 'Check number is required';
    }
    if (!bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }
    if (!checkImage) {
      newErrors.check = 'Check image is required';
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
      payment_method: 'pdo',
      amount,
      pdo_check_number: checkNumber,
      pdo_check_bank: bankName,
      pdo_check_image: checkImage
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
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Banknote size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">PDO Payment</h3>
                <p className="text-amber-100 text-sm">Post-Dated Check</p>
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
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Check Amount</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              ₱{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Check Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Check Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={checkNumber}
              onChange={(e) => setCheckNumber(e.target.value)}
              placeholder="e.g., 123456"
              className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-amber-500/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.checkNumber ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-amber-500'
              }`}
            />
            {errors.checkNumber && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.checkNumber}
              </p>
            )}
          </div>

          {/* Bank Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Bank Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g., BDO, BPI, Metrobank"
              className={`w-full px-4 py-2 border-2 rounded-lg focus:ring-2 focus:ring-amber-500/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.bankName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-amber-500'
              }`}
            />
            {errors.bankName && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.bankName}
              </p>
            )}
          </div>

          {/* Check Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Check Image <span className="text-red-500">*</span>
            </label>

            {!checkPreview ? (
              <label className={`block w-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                errors.check 
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
              }`}>
                <Upload size={32} className={`mx-auto mb-2 ${errors.check ? 'text-red-500' : 'text-gray-400'}`} />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Click to upload check photo
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
                  src={checkPreview}
                  alt="Check preview"
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

            {errors.check && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.check}
              </p>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-700">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <p className="font-semibold mb-1">PDO Approval Process</p>
                <p>Your check will be reviewed by an admin. Once approved, the order will be processed. The check will be deposited on the due date.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl flex gap-3">
          <Button onClick={onCancel} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="flex-1 bg-amber-600 hover:bg-amber-700">
            Submit Check
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PDOPaymentModal;
