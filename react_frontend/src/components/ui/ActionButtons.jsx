import { Eye, Edit, Trash2, MoreHorizontal } from 'lucide-react';

const ActionButtons = ({ onView, onEdit, onDelete, size = 'sm' }) => {
  const iconSize = size === 'sm' ? 15 : 18;
  const btnClass = size === 'sm' ? 'p-1.5' : 'p-2';

  return (
    <div className="flex items-center gap-1">
      {onView && (
        <button
          onClick={(e) => { e.stopPropagation(); onView(); }}
          className={`${btnClass} rounded-md hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors`}
          title="View"
        >
          <Eye size={iconSize} />
        </button>
      )}
      {onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className={`${btnClass} rounded-md hover:bg-button-50 text-button-500 hover:text-button-700 transition-colors`}
          title="Edit"
        >
          <Edit size={iconSize} />
        </button>
      )}
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className={`${btnClass} rounded-md hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors`}
          title="Delete"
        >
          <Trash2 size={iconSize} />
        </button>
      )}
    </div>
  );
};

export default ActionButtons;
