import { Clock, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui';

const CreditPaymentModal = ({ amount, customerName, onSubmit, onCancel }) => {
  const handleSubmit = () => {
    onSubmit({
      payment_method: 'credit',
      amount
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Clock size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Credit Payment</h3>
                <p className="text-purple-100 text-sm">Pay Later / On Account</p>
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
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Amount to Credit</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              ₱{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Customer Info */}
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Customer</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{customerName}</p>
          </div>

          {/* Info Box */}
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-purple-700 dark:text-purple-300">
                <p className="font-semibold mb-1">Credit Terms</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>This amount will be added to the customer's balance</li>
                  <li>Customer can pay later at their convenience</li>
                  <li>Order will be processed immediately</li>
                  <li>Payment can be made in full or in installments</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Confirmation */}
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
            <div className="flex items-start gap-2">
              <CheckCircle size={16} className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-700 dark:text-green-300">
                <p className="font-semibold mb-1">Ready to Process</p>
                <p>Click "Confirm Credit" to add this amount to the customer's account and process the order.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl flex gap-3">
          <Button onClick={onCancel} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="flex-1 bg-purple-600 hover:bg-purple-700">
            Confirm Credit
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreditPaymentModal;
