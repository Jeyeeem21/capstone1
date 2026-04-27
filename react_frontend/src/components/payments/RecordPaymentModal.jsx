import { useState } from 'react';
import { DollarSign, Smartphone, Banknote, Clock, X, AlertCircle } from 'lucide-react';
import { Button } from '../ui';
import GCashPaymentModal from './GCashPaymentModal';
import PDOPaymentModal from './PDOPaymentModal';
import CreditPaymentModal from './CreditPaymentModal';

const RecordPaymentModal = ({ saleId, balanceRemaining, customerName, onSubmit, onCancel }) => {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [amount, setAmount] = useState('');
  const [showMethodModal, setShowMethodModal] = useState(false);

  const paymentMethods = [
    { id: 'cash', name: 'Cash', icon: DollarSign, color: 'green', description: 'Immediate payment' },
    { id: 'gcash', name: 'GCash', icon: Smartphone, color: 'blue', description: 'With verification' },
    { id: 'pdo', name: 'PDO', icon: Banknote, color: 'amber', description: 'Post-dated check' },
    { id: 'credit', name: 'Credit', icon: Clock, color: 'purple', description: 'Pay later' }
  ];

  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
    if (method === 'cash') {
      // Cash payment is simple, no modal needed
      return;
    }
    setShowMethodModal(true);
  };

  const handleMethodSubmit = (paymentData) => {
    onSubmit({
      sale_id: saleId,
      ...paymentData
    });
  };

  const handleCashSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) {
      return;
    }

    onSubmit({
      sale_id: saleId,
      payment_method: 'cash',
      amount: parseFloat(amount)
    });
  };

  const getColorClasses = (color, isSelected) => {
    const colors = {
      green: isSelected 
        ? 'bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300'
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20',
      blue: isSelected
        ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20',
      amber: isSelected
        ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-500 text-amber-700 dark:text-amber-300'
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20',
      purple: isSelected
        ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-500 text-purple-700 dark:text-purple-300'
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20'
    };
    return colors[color];
  };

  if (showMethodModal && selectedMethod) {
    const paymentAmount = parseFloat(amount) || balanceRemaining;

    if (selectedMethod === 'gcash') {
      return (
        <GCashPaymentModal
          amount={paymentAmount}
          onSubmit={handleMethodSubmit}
          onCancel={() => setShowMethodModal(false)}
        />
      );
    }

    if (selectedMethod === 'pdo') {
      return (
        <PDOPaymentModal
          amount={paymentAmount}
          onSubmit={handleMethodSubmit}
          onCancel={() => setShowMethodModal(false)}
        />
      );
    }

    if (selectedMethod === 'credit') {
      return (
        <CreditPaymentModal
          amount={paymentAmount}
          customerName={customerName}
          onSubmit={handleMethodSubmit}
          onCancel={() => setShowMethodModal(false)}
        />
      );
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Record Payment</h3>
              <p className="text-primary-100 text-sm">Add payment to this order</p>
            </div>
            <button onClick={onCancel} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Balance Display */}
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">Outstanding Balance</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              ₱{balanceRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Payment Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                max={balanceRemaining}
                className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-semibold"
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setAmount((balanceRemaining / 2).toFixed(2))}
                className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Half
              </button>
              <button
                onClick={() => setAmount(balanceRemaining.toFixed(2))}
                className="text-xs px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded hover:bg-primary-200 dark:hover:bg-primary-900/50"
              >
                Full Balance
              </button>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const isSelected = selectedMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => handleMethodSelect(method.id)}
                    className={`p-4 border-2 rounded-lg transition-all ${getColorClasses(method.color, isSelected)}`}
                  >
                    <Icon size={24} className="mx-auto mb-2" />
                    <p className="font-semibold text-sm">{method.name}</p>
                    <p className="text-xs opacity-75 mt-1">{method.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info */}
          {parseFloat(amount) > balanceRemaining && (
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-700">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">
                  Payment amount cannot exceed the outstanding balance
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl flex gap-3">
          <Button onClick={onCancel} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={selectedMethod === 'cash' ? handleCashSubmit : () => setShowMethodModal(true)}
            disabled={!selectedMethod || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > balanceRemaining}
            className="flex-1"
          >
            {selectedMethod === 'cash' ? 'Record Payment' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RecordPaymentModal;
