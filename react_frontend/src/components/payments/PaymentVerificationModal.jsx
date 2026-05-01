import { useState } from 'react';
import { DollarSign, CreditCard, FileText, Calendar, Image as ImageIcon, X, Eye, CheckCircle } from 'lucide-react';
import { StatusBadge, Button, Modal } from '../ui';

const PaymentVerificationModal = ({ payment, onClose, onVerify }) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const getMethodBadge = (method) => {
    const badges = {
      cash: { color: '#22c55e', label: 'Cash' },
      gcash: { color: '#3b82f6', label: 'GCash' },
      pdo: { color: '#f59e0b', label: 'PDO' },
      credit: { color: '#8b5cf6', label: 'Credit' }
    };
    return badges[method] || badges.cash;
  };

  const canVerify = onVerify && (
    payment.status === 'needs_verification' ||
    payment.status === 'on_hold' ||
    (payment.payment_method === 'pdo' && payment.status === 'pending' && payment.pdo_approval_status === 'approved')
  );

  const methodBadge = getMethodBadge(payment.payment_method);

  return (
    <>
      <Modal
        isOpen={true}
        onClose={onClose}
        title="Payment Details"
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            {canVerify && (
              <Button
                onClick={() => {
                  onVerify(payment.id, 'Verified from payment details');
                  onClose();
                }}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle size={15} />
                Verify Payment
              </Button>
            )}
            <Button onClick={onClose} variant="outline">Close</Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Payment ID & Status */}
            <div className="bg-gradient-to-r from-primary-50 to-button-50 dark:from-gray-700 dark:to-gray-700 p-4 rounded-lg border-2 border-primary-200 dark:border-primary-700">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-button-500 dark:bg-button-600 text-white rounded-lg">
                  <DollarSign size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Payment #{payment.id}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-300">Payment ID</p>
                </div>
                <StatusBadge status={
                  payment.payment_method === 'pdo' && payment.status === 'pending' && payment.pdo_approval_status === 'approved'
                    ? 'Awaiting Payment'
                    : payment.status === 'needs_verification' 
                      ? 'Pending' 
                      : payment.status === 'on_hold' 
                        ? 'On Hold' 
                        : payment.status === 'verified' 
                          ? 'Verified' 
                          : payment.status === 'pending'
                            ? 'Pending'
                            : 'Cancelled'
                } />
              </div>
            </div>

            {/* Payment Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Amount */}
              <div className="flex items-start gap-2 p-3 bg-gradient-to-r from-button-50 to-primary-50 dark:from-gray-700 dark:to-gray-700 rounded-lg border-2 border-button-200 dark:border-button-700">
                <div className="p-2 bg-button-500 dark:bg-button-600 text-white rounded-lg">
                  <DollarSign size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-0.5">Amount</p>
                  <p className="text-xl font-bold text-button-600 dark:text-button-400">
                    ₱{payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Payment Method */}
              <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  <CreditCard size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-0.5">Payment Method</p>
                  <span
                    className="inline-block px-2 py-1 rounded-full text-sm font-semibold"
                    style={{
                      backgroundColor: `${methodBadge.color}20`,
                      color: methodBadge.color
                    }}
                  >
                    {methodBadge.label}
                  </span>
                </div>
              </div>

              {/* Reference Number */}
              <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                  <FileText size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-0.5">Reference Number</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                    {payment.reference_number || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                  <Calendar size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-0.5">Date Created</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                    {new Date(payment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(payment.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            {payment.sale?.customer && (
              <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <FileText size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-0.5">Customer</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                    {payment.sale.customer.name}
                  </p>
                </div>
              </div>
            )}

            {/* PDO Check Details (if PDO payment) */}
            {payment.payment_method === 'pdo' && payment.pdo_check_number && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-lg space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-amber-500 dark:bg-amber-600 text-white rounded-lg">
                    <FileText size={16} />
                  </div>
                  <label className="text-sm font-bold text-amber-900 dark:text-amber-300">
                    PDO Check Information
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mb-0.5">Check Number</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                      {payment.pdo_check_number}
                    </p>
                  </div>
                  {payment.pdo_check_bank && (
                    <div>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mb-0.5">Bank</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                        {payment.pdo_check_bank}
                      </p>
                    </div>
                  )}
                  {payment.pdo_check_date && (
                    <div>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mb-0.5">Check Date</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                        {new Date(payment.pdo_check_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                  {payment.pdo_approval_status && (
                    <div>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mb-0.5">Approval Status</p>
                      <StatusBadge status={
                        payment.pdo_approval_status === 'approved' 
                          ? 'Approved' 
                          : payment.pdo_approval_status === 'pending'
                            ? 'Pending Approval'
                            : 'Rejected'
                      } />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Proof of Payment Images */}
            {payment.payment_proof_urls && payment.payment_proof_urls.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                    <ImageIcon size={16} />
                  </div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Proof of Payment
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {payment.payment_proof_urls.map((imageUrl, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={imageUrl}
                        alt={`Payment proof ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                        onClick={() => {
                          setSelectedImage(imageUrl);
                          setShowImageModal(true);
                        }}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Eye size={32} className="text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes (if any) */}
            {payment.notes && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold mb-1">Notes</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{payment.notes}</p>
              </div>
            )}
        </div>
      </Modal>

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-4" onClick={() => {
          setShowImageModal(false);
          setSelectedImage(null);
        }}>
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => {
                setShowImageModal(false);
                setSelectedImage(null);
              }}
              className="absolute -top-12 right-0 text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
            <img
              src={selectedImage}
              alt="Payment proof full size"
              className="w-full h-auto rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default PaymentVerificationModal;
