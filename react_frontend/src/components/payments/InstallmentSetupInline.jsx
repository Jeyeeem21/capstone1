import { useState, useMemo, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
import { Button } from '../ui';

const InstallmentSetupInline = forwardRef(({ totalAmount, onChange, initialInstallments = null }, ref) => {
  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [installments, setInstallments] = useState(
    initialInstallments && initialInstallments.length > 0
      ? initialInstallments
      : [{ installment_number: 1, amount: '', due_date: getTodayDate() }]
  );
  const [fieldErrors, setFieldErrors] = useState({});

  const totalAllocated = useMemo(() => {
    return installments.reduce((sum, inst) => {
      const amount = parseFloat(inst.amount) || 0;
      return sum + amount;
    }, 0);
  }, [installments]);

  const remainingBalance = totalAmount - totalAllocated;
  
  // Check if all installments have both amount and a valid (non-past) due date
  const allFieldsFilled = useMemo(() => {
    const today = getTodayDate();
    return installments.every(inst => {
      const hasAmount = inst.amount && parseFloat(inst.amount) > 0;
      const hasDueDate = inst.due_date && inst.due_date.trim() !== '' && inst.due_date >= today;
      return hasAmount && hasDueDate;
    });
  }, [installments]);
  
  const isValid = Math.abs(remainingBalance) < 0.01 && totalAllocated > 0 && allFieldsFilled;

  // Auto-update parent whenever installments change
  useEffect(() => {
    if (isValid) {
      onChange(installments);
      setFieldErrors({}); // Clear errors when valid
    } else {
      onChange(null);
    }
  }, [installments, isValid, onChange]);

  const addInstallment = () => {
    setInstallments([
      ...installments,
      {
        installment_number: installments.length + 1,
        amount: '',
        due_date: ''
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

    if (field === 'amount') {
      const newAmount = parseFloat(value) || 0;
      const otherTotal = updated.reduce((sum, inst, i) =>
        i === index ? sum : sum + (parseFloat(inst.amount) || 0), 0);
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${index}-amount`];
        if (newAmount <= 0 && value !== '') {
          newErrors[`${index}-amount`] = 'Amount must be greater than 0';
        } else if (otherTotal + newAmount > totalAmount + 0.001) {
          const maxAllowed = totalAmount - otherTotal;
          newErrors[`${index}-amount`] = `Cannot exceed ₱${maxAllowed.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        }
        return newErrors;
      });
    } else {
      // Clear error for this field when user types
      if (fieldErrors[`${index}-${field}`]) {
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[`${index}-${field}`];
          return newErrors;
        });
      }
    }
  };

  const validateFields = () => {
    const errors = {};
    let runningTotal = 0;
    installments.forEach((inst, index) => {
      const amount = parseFloat(inst.amount) || 0;
      if (!inst.amount || amount <= 0) {
        errors[`${index}-amount`] = 'Amount is required';
      } else {
        const otherTotal = installments.reduce((sum, other, i) =>
          i === index ? sum : sum + (parseFloat(other.amount) || 0), 0);
        if (otherTotal + amount > totalAmount + 0.001) {
          const maxAllowed = totalAmount - otherTotal;
          errors[`${index}-amount`] = `Cannot exceed ₱${maxAllowed.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        }
      }
      runningTotal += amount;
      if (!inst.due_date || inst.due_date.trim() === '') {
        errors[`${index}-due_date`] = 'Due date is required';
      } else if (inst.due_date < getTodayDate()) {
        errors[`${index}-due_date`] = 'Due date cannot be in the past';
      }
    });
    setFieldErrors(errors);
    
    const isValid = Object.keys(errors).length === 0;
    const errorMessage = !isValid 
      ? 'Please fill in all required fields.' 
      : remainingBalance > 0.01 
        ? `Remaining balance: ₱${remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}. Please allocate the full order amount.`
        : '';
    
    return { valid: isValid && remainingBalance <= 0.01, error: errorMessage };
  };

  // Expose validate function and getInstallments to parent
  useImperativeHandle(ref, () => ({
    validate: validateFields,
    getInstallments: () => installments.map(inst => ({
      amount: parseFloat(inst.amount) || 0,
      dueDate: inst.due_date,
      installmentNumber: inst.installment_number
    }))
  }));

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Order Total</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Remaining</p>
            <p className={`text-lg font-bold ${remainingBalance > 0.01 ? 'text-red-600' : remainingBalance < -0.01 ? 'text-orange-600' : 'text-green-600'}`}>
              ₱{Math.abs(remainingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Info Message */}
      <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <AlertCircle size={14} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Payment method will be selected when the customer pays each installment.
        </p>
      </div>

      {/* Installments List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {installments.map((inst, index) => {
          const amountError = fieldErrors[`${index}-amount`];
          const dueDateError = fieldErrors[`${index}-due_date`];
          
          return (
            <div key={index} className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-gray-800 dark:text-white">Installment #{inst.installment_number}</h5>
                {installments.length > 1 && (
                  <button
                    onClick={() => removeInstallment(index)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Amount */}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={totalAmount - installments.reduce((sum, other, i) => i === index ? sum : sum + (parseFloat(other.amount) || 0), 0)}
                    value={inst.amount}
                    onChange={(e) => updateInstallment(index, 'amount', e.target.value)}
                    placeholder="0.00"
                    className={`w-full px-2 py-1.5 text-xs border rounded focus:ring-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                      amountError 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                        : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20'
                    }`}
                  />
                  {amountError && (
                    <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1">
                      <AlertCircle size={10} /> {amountError}
                    </p>
                  )}
                </div>

                {/* Due Date */}
                <div>
                  <label className="flex text-[10px] font-semibold text-gray-600 dark:text-gray-300 mb-1 items-center gap-1">
                    <Calendar size={10} />
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={inst.due_date}
                    min={getTodayDate()}
                    onChange={(e) => updateInstallment(index, 'due_date', e.target.value)}
                    className={`w-full px-2 py-1.5 text-xs border rounded focus:ring-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                      dueDateError 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                        : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20'
                    }`}
                  />
                  {dueDateError && (
                    <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1">
                      <AlertCircle size={10} /> {dueDateError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Installment Button */}
      <Button
        onClick={addInstallment}
        variant="outline"
        size="sm"
        className="w-full"
        disabled={isValid || remainingBalance < -0.01}
      >
        <Plus size={14} />
        Add Installment
      </Button>

      {/* Validation Message */}
      {!isValid && totalAllocated > 0 && (
        <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <AlertCircle size={14} className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-red-700 dark:text-red-300">
            {remainingBalance > 0.01 ? (
              <p>Need <strong>₱{remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> more to reach total.</p>
            ) : remainingBalance < -0.01 ? (
              <p>Total exceeds order amount by <strong>₱{Math.abs(remainingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>. Please reduce installment amounts.</p>
            ) : (
              <p>Please fill in all required fields.</p>
            )}
          </div>
        </div>
      )}

      {isValid && (
        <div className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <CheckCircle size={14} className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-green-700 dark:text-green-300">
            Payment schedule is valid! Total: <strong>₱{totalAllocated.toLocaleString()}</strong>
          </p>
        </div>
      )}
    </div>
  );
});

InstallmentSetupInline.displayName = 'InstallmentSetupInline';

export default InstallmentSetupInline;
