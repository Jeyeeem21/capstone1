import { useState, useMemo } from 'react';
import { Plus, Trash2, DollarSign, Smartphone, Clock, Banknote, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
import { Button } from '../ui';

const PaymentScheduleSetup = ({ orderTotal, onSave, onCancel }) => {
  const [installments, setInstallments] = useState([
    { installment_number: 1, amount: '', payment_method: 'cash', due_date: '', pay_now: false }
  ]);

  const totalAllocated = useMemo(() => {
    return installments.reduce((sum, inst) => {
      const amount = parseFloat(inst.amount) || 0;
      return sum + amount;
    }, 0);
  }, [installments]);

  const remainingBalance = orderTotal - totalAllocated;
  const isValid = Math.abs(remainingBalance) < 0.01;

  const addInstallment = () => {
    setInstallments([
      ...installments,
      {
        installment_number: installments.length + 1,
        amount: '',
        payment_method: 'cash',
        due_date: '',
        pay_now: false
      }
    ]);
  };

  const removeInstallment = (index) => {
    if (installments.length === 1) return;
    const updated = installments.filter((_, i) => i !== index);
    // Renumber
    updated.forEach((inst, i) => {
      inst.installment_number = i + 1;
    });
    setInstallments(updated);
  };

  const updateInstallment = (index, field, value) => {
    const updated = [...installments];
    updated[index] = { ...updated[index], [field]: value };
    setInstallments(updated);
  };

  const handleSave = () => {
    if (!isValid) return;
    onSave(installments);
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case 'cash': return DollarSign;
      case 'gcash': return Smartphone;
      case 'pdo': return Banknote;
      case 'credit': return Clock;
      default: return DollarSign;
    }
  };

  const getMethodColor = (method) => {
    switch (method) {
      case 'cash': return '#22c55e';
      case 'gcash': return '#3b82f6';
      case 'pdo': return '#f59e0b';
      case 'credit': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 p-4 rounded-lg border border-primary-200 dark:border-primary-700">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white">Order Total</h4>
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              ₱{orderTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <h4 className="font-bold text-gray-900 dark:text-white">Remaining</h4>
            <p className={`text-2xl font-bold ${remainingBalance > 0.01 ? 'text-red-600' : remainingBalance < -0.01 ? 'text-orange-600' : 'text-green-600'}`}>
              ₱{Math.abs(remainingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Installments List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {installments.map((inst, index) => {
          const Icon = getMethodIcon(inst.payment_method);
          const color = getMethodColor(inst.payment_method);

          return (
            <div key={index} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-gray-900 dark:text-white">Installment #{inst.installment_number}</h5>
                {installments.length > 1 && (
                  <button
                    onClick={() => removeInstallment(index)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={inst.amount}
                    onChange={(e) => updateInstallment(index, 'amount', e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Method <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={inst.payment_method}
                      onChange={(e) => updateInstallment(index, 'payment_method', e.target.value)}
                      className="w-full px-3 py-2 pl-9 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                    >
                      <option value="cash">Cash</option>
                      <option value="gcash">GCash</option>
                      <option value="pdo">PDO</option>
                      <option value="credit">Credit</option>
                    </select>
                    <Icon size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color }} />
                  </div>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                  <Calendar size={12} />
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={inst.due_date}
                  onChange={(e) => updateInstallment(index, 'due_date', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Pay Now Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inst.pay_now}
                  onChange={(e) => updateInstallment(index, 'pay_now', e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pay this installment now
                </span>
              </label>

              {/* PDO Fields */}
              {inst.payment_method === 'pdo' && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Check Number
                    </label>
                    <input
                      type="text"
                      value={inst.pdo_check_number || ''}
                      onChange={(e) => updateInstallment(index, 'pdo_check_number', e.target.value)}
                      placeholder="12345"
                      className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={inst.pdo_check_bank || ''}
                      onChange={(e) => updateInstallment(index, 'pdo_check_bank', e.target.value)}
                      placeholder="BDO"
                      className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* GCash Fields */}
              {inst.payment_method === 'gcash' && inst.pay_now && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={inst.reference_number || ''}
                    onChange={(e) => updateInstallment(index, 'reference_number', e.target.value)}
                    placeholder="GC123456789"
                    className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Installment Button */}
      <Button
        onClick={addInstallment}
        variant="outline"
        className="w-full"
      >
        <Plus size={16} />
        Add Installment
      </Button>

      {/* Validation Message */}
      {!isValid && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <AlertCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-700 dark:text-red-300">
            {remainingBalance > 0.01 ? (
              <p>Installments total is <strong>₱{totalAllocated.toLocaleString()}</strong>. You need to allocate <strong>₱{remainingBalance.toLocaleString()}</strong> more.</p>
            ) : (
              <p>Installments total is <strong>₱{totalAllocated.toLocaleString()}</strong>. You've allocated <strong>₱{Math.abs(remainingBalance).toLocaleString()}</strong> too much.</p>
            )}
          </div>
        </div>
      )}

      {isValid && totalAllocated > 0 && (
        <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <CheckCircle size={16} className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-300">
            Payment schedule is valid! Total: <strong>₱{totalAllocated.toLocaleString()}</strong>
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button onClick={onCancel} variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!isValid}
          className="flex-1"
        >
          Save Payment Schedule
        </Button>
      </div>
    </div>
  );
};

export default PaymentScheduleSetup;
