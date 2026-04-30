import { AlertCircle, CheckCircle } from 'lucide-react';
import { Button, Modal } from '../ui';

const CreditPaymentModal = ({ amount, customerName, onSubmit, onCancel }) => {
  const handleSubmit = () => {
    onSubmit({
      payment_method: 'credit',
      amount
    });
  };

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title="Credit Payment"
      size="md"
      footer={
        <div className="flex gap-3">
          <Button onClick={onCancel} variant="outline" className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} className="flex-1">Confirm Credit</Button>
        </div>
      }
    >
      <div className="space-y-4">
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
    </Modal>
  );
};

export default CreditPaymentModal;
