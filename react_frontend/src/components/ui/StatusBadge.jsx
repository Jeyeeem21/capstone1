const StatusBadge = ({ status, variant }) => {
  const variants = {
    success: 'bg-green-50 text-green-600',
    warning: 'bg-yellow-50 text-yellow-600',
    danger: 'bg-red-50 text-red-600',
    info: 'bg-blue-50 text-blue-600',
    default: 'bg-gray-50 text-gray-600',
  };

  // Auto-detect variant based on status if not provided
  const getVariant = () => {
    if (variant) return variants[variant] || variants.default;
    
    const statusLower = status?.toLowerCase() || '';
    if (['active', 'completed', 'in stock', 'paid', 'approved'].includes(statusLower)) {
      return variants.success;
    }
    if (['pending', 'low stock', 'processing', 'warning'].includes(statusLower)) {
      return variants.warning;
    }
    if (['inactive', 'cancelled', 'out of stock', 'rejected', 'failed'].includes(statusLower)) {
      return variants.danger;
    }
    if (['info', 'new', 'draft'].includes(statusLower)) {
      return variants.info;
    }
    return variants.default;
  };

  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getVariant()}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
