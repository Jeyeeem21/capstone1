import { useState } from 'react';
import { X, Eye, DollarSign, Hash, Building2, Calendar, FileText } from 'lucide-react';
import { Button, StatusBadge, Modal } from '../ui';

const PDOApprovalModal = ({ installment, onClose }) => {
  const [showImageModal, setShowImageModal] = useState(false);

  // Get check image URL
  const getCheckImageUrl = () => {
    if (!installment.pdo_check_image) return null;
    
    // Handle array of images
    if (Array.isArray(installment.pdo_check_image)) {
      const firstImage = installment.pdo_check_image[0];
      return firstImage?.startsWith('http') ? firstImage : `${window.location.origin}/storage/${firstImage}`;
    }
    
    // Handle single image string
    return installment.pdo_check_image.startsWith('http') 
      ? installment.pdo_check_image 
      : `${window.location.origin}/storage/${installment.pdo_check_image}`;
  };

  const checkImageUrl = getCheckImageUrl();

  return (
    <>
      <Modal
        isOpen={true}
        onClose={onClose}
        title="PDO Check Details"
        size="xl"
        footer={
          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">Close</Button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-3">
                {/* Sale ID & Status */}
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-gray-700 dark:to-gray-700 p-3 rounded-lg border-2 border-amber-200 dark:border-amber-700">
                  <div className="flex items-start gap-2">
                    <div className="p-2 bg-amber-500 dark:bg-amber-600 text-white rounded-lg">
                      <FileText size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Sale #{installment.sale_id}</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {installment.installment_number ? `Installment #${installment.installment_number}` : 'Full Payment'}
                      </p>
                    </div>
                    <StatusBadge status={installment.pdo_approval_status || installment.status} />
                  </div>
                </div>

                {/* Customer */}
                {installment.sale?.customer && (
                  <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                      <Building2 size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 dark:text-gray-300 mb-0.5">Customer</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                        {installment.sale.customer.name}
                      </p>
                    </div>
                  </div>
                )}

                {/* Amount */}
                <div className="flex items-start gap-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-700 rounded-lg border-2 border-green-200 dark:border-green-700">
                  <div className="p-2 bg-green-500 dark:bg-green-600 text-white rounded-lg">
                    <DollarSign size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-0.5">Amount</p>
                    <p className="text-xl font-bold text-gray-800 dark:text-gray-100">
                      ₱{installment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Due Date */}
                {installment.due_date && (
                  <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                      <Calendar size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 dark:text-gray-300 mb-0.5">Due Date</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                        {new Date(installment.due_date).toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-3">
                {/* Check Number */}
                <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <Hash size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-0.5">Check Number</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                      {installment.pdo_check_number || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Bank */}
                <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
                    <Building2 size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-0.5">Bank</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                      {installment.pdo_check_bank || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Check Date */}
                {installment.pdo_check_date && (
                  <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                      <Calendar size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 dark:text-gray-300 mb-0.5">Check Date</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                        {new Date(installment.pdo_check_date).toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Check Image */}
                {checkImageUrl && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Check Image
                    </label>
                    <div className="relative group">
                      <img
                        src={checkImageUrl}
                        alt="Check image"
                        className="w-full h-48 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                        onClick={() => setShowImageModal(true)}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Eye size={32} className="text-white" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
        </div>
      </Modal>

      {/* Image Modal */}
      {showImageModal && checkImageUrl && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-4" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-12 right-0 text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
            <img
              src={checkImageUrl}
              alt="Check full size"
              className="w-full h-auto rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default PDOApprovalModal;
