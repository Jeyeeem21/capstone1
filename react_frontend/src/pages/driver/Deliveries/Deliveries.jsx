import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Truck, Package, MapPin, Clock, CheckCircle, XCircle, Navigation,
  Search, ChevronDown, ChevronUp, Eye, AlertTriangle, Calendar, 
  Phone, User, FileText, Camera, MessageSquare, Send
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { Skeleton } from '../../../components/ui';

// Status config
const statusConfig = {
  'Pending': { color: '#f59e0b', bg: '#fef3c7', icon: Clock, label: 'Pending' },
  'In Transit': { color: '#3b82f6', bg: '#dbeafe', icon: Navigation, label: 'In Transit' },
  'Delivered': { color: '#22c55e', bg: '#dcfce7', icon: CheckCircle, label: 'Delivered' },
  'Failed': { color: '#ef4444', bg: '#fee2e2', icon: XCircle, label: 'Failed' },
  'Cancelled': { color: '#6b7280', bg: '#f3f4f6', icon: XCircle, label: 'Cancelled' },
};

const priorityColors = {
  'Low': { color: '#6b7280', bg: '#f3f4f6' },
  'Normal': { color: '#3b82f6', bg: '#dbeafe' },
  'High': { color: '#f59e0b', bg: '#fef3c7' },
  'Urgent': { color: '#ef4444', bg: '#fee2e2' },
};

// Deliveries — will connect to real API
const mockDeliveries = [];

const statusTabs = ['All', 'Pending', 'In Transit', 'Delivered', 'Failed'];

const Deliveries = () => {
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    const tabFromUrl = searchParams.get('tab');
    return tabFromUrl && statusTabs.includes(tabFromUrl) ? tabFromUrl : 'All';
  });

  // Sync active tab to URL
  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true });
  }, [activeTab]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDelivery, setExpandedDelivery] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { delivery, action }
  const [driverNotes, setDriverNotes] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Filtered deliveries
  const filteredDeliveries = mockDeliveries.filter(d => {
    const matchesTab = activeTab === 'All' || d.status === activeTab;
    const matchesSearch = !searchTerm || 
      d.delivery_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.customer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // Stats
  const stats = {
    total: mockDeliveries.length,
    pending: mockDeliveries.filter(d => d.status === 'Pending').length,
    inTransit: mockDeliveries.filter(d => d.status === 'In Transit').length,
    delivered: mockDeliveries.filter(d => d.status === 'Delivered').length,
  };

  const handleAction = (delivery, action) => {
    setActionModal({ delivery, action });
    setDriverNotes('');
  };

  const handleConfirmAction = () => {
    // In real app, this would call the API
    setActionModal(null);
    setDriverNotes('');
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold" style={{ color: theme.text_primary }}>My Deliveries</h1>
        <p className="text-xs mt-0.5" style={{ color: theme.text_secondary }}>
          Manage and track your assigned deliveries
        </p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4" style={{ border: `1px solid ${theme.border_color}` }}>
              <Skeleton variant="title" width="w-12" className="mb-1" />
              <Skeleton variant="text" width="w-20" />
            </div>
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: theme.button_primary },
          { label: 'Pending', value: stats.pending, color: '#f59e0b' },
          { label: 'In Transit', value: stats.inTransit, color: '#3b82f6' },
          { label: 'Delivered', value: stats.delivered, color: '#22c55e' },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl p-4" style={{ border: `1px solid ${theme.border_color}` }}>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs" style={{ color: theme.text_secondary }}>{stat.label}</p>
          </div>
        ))}
      </div>
      )}

      {/* Filters */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6" style={{ border: `1px solid ${theme.border_color}` }}>
          <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton variant="input" className="flex-1" />
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => <Skeleton key={i} variant="button" width="w-20" />)}
            </div>
          </div>
        </div>
      ) : (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6" style={{ border: `1px solid ${theme.border_color}` }}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.text_secondary }} />
            <input
              type="text"
              placeholder="Search by delivery #, destination, or client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border-2 rounded-xl focus:outline-none transition-all"
              style={{ borderColor: theme.border_color, color: theme.text_primary }}
              onFocus={(e) => e.target.style.borderColor = theme.button_primary}
              onBlur={(e) => e.target.style.borderColor = theme.border_color}
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {statusTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
                style={activeTab === tab ? {
                  backgroundColor: theme.button_primary,
                  color: '#fff',
                } : {
                  backgroundColor: '#f3f4f6',
                  color: theme.text_secondary,
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Deliveries List */}
      {loading ? (
        <div className="columns-1 md:columns-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 mb-4 break-inside-avoid" style={{ border: `1px solid ${theme.border_color}` }}>
              <div className="flex items-center justify-between mb-3">
                <Skeleton variant="text" width="w-44" />
                <Skeleton variant="button" width="w-24" />
              </div>
              <Skeleton variant="text" width="w-64" className="mb-2" />
              <div className="flex justify-between">
                <Skeleton variant="text" width="w-32" />
                <Skeleton variant="title" width="w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredDeliveries.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl" style={{ border: `1px solid ${theme.border_color}` }}>
          <Truck size={48} className="mx-auto mb-4" style={{ color: theme.text_secondary }} />
          <h3 className="text-lg font-semibold" style={{ color: theme.text_primary }}>No deliveries found</h3>
          <p className="text-sm mt-1" style={{ color: theme.text_secondary }}>
            {activeTab !== 'All' ? `No ${activeTab.toLowerCase()} deliveries` : 'Try a different search term'}
          </p>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 gap-4">
          {filteredDeliveries.map(delivery => {
            const config = statusConfig[delivery.status];
            const priConfig = priorityColors[delivery.priority];
            const StatusIcon = config.icon;
            const isExpanded = expandedDelivery === delivery.id;
            const totalValue = delivery.items.reduce((s, i) => s + i.total, 0);
            const totalItems = delivery.items.reduce((s, i) => s + i.quantity, 0);

            return (
              <div 
                key={delivery.id}
                className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden transition-all mb-4 break-inside-avoid"
                style={{ border: `1px solid ${theme.border_color}` }}
              >
                {/* Delivery Header */}
                <button
                  onClick={() => setExpandedDelivery(isExpanded ? null : delivery.id)}
                  className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: config.bg }}>
                        <StatusIcon size={16} style={{ color: config.color }} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold" style={{ color: theme.text_primary }}>{delivery.delivery_number}</p>
                        <p className="text-[10px]" style={{ color: theme.text_secondary }}>
                          <Calendar size={10} className="inline mr-1" />
                          {delivery.delivery_date}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: priConfig.bg, color: priConfig.color }}>
                        {delivery.priority}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: config.bg, color: config.color }}>
                        {delivery.status}
                      </span>
                      {isExpanded ? <ChevronUp size={16} style={{ color: theme.text_secondary }} /> : <ChevronDown size={16} style={{ color: theme.text_secondary }} />}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1 text-left">
                    <MapPin size={12} style={{ color: theme.text_secondary }} />
                    <p className="text-xs truncate" style={{ color: theme.text_primary }}>{delivery.destination}</p>
                  </div>
                  <div className="flex items-center justify-between text-left">
                    <p className="text-xs" style={{ color: theme.text_secondary }}>
                      {totalItems} {totalItems === 1 ? 'sack' : 'sacks'} · {delivery.customer}
                    </p>
                    <p className="text-sm font-bold" style={{ color: theme.button_primary }}>₱{totalValue.toLocaleString()}</p>
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t" style={{ borderColor: theme.border_color }}>
                    {/* Contact Info */}
                    <div className="px-4 py-3" style={{ backgroundColor: '#f9fafb' }}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.text_secondary }}>Contact Info</p>
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-1.5">
                          <User size={12} style={{ color: theme.text_secondary }} />
                          <span className="text-xs" style={{ color: theme.text_primary }}>{delivery.contact_person}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone size={12} style={{ color: theme.text_secondary }} />
                          <a href={`tel:${delivery.contact_phone}`} className="text-xs hover:underline" style={{ color: theme.button_primary }}>
                            {delivery.contact_phone}
                          </a>
                        </div>
                      </div>
                      {delivery.notes && (
                        <div className="mt-2 flex items-start gap-1.5">
                          <FileText size={12} className="mt-0.5 flex-shrink-0" style={{ color: theme.text_secondary }} />
                          <p className="text-xs" style={{ color: theme.text_secondary }}>{delivery.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Products */}
                    <div className="px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: theme.text_secondary }}>Products Assigned</p>
                      <div className="space-y-2">
                        {delivery.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
                            <div className="flex items-center gap-2">
                              <Package size={14} style={{ color: theme.button_primary }} />
                              <div>
                                <p className="text-xs font-medium" style={{ color: theme.text_primary }}>{item.product_name}</p>
                                <p className="text-[10px]" style={{ color: theme.text_secondary }}>
                                  {item.quantity} {item.unit} × ₱{item.price.toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <p className="text-xs font-semibold" style={{ color: theme.text_primary }}>₱{item.total.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-3 pt-3 border-t" style={{ borderColor: theme.border_color }}>
                        <p className="text-xs font-semibold" style={{ color: theme.text_primary }}>Total</p>
                        <p className="text-sm font-bold" style={{ color: theme.button_primary }}>₱{totalValue.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Driver Notes (if any) */}
                    {delivery.driver_notes && (
                      <div className="px-4 py-3 border-t" style={{ borderColor: theme.border_color }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: theme.text_secondary }}>Driver Notes</p>
                        <p className="text-xs" style={{ color: theme.text_primary }}>{delivery.driver_notes}</p>
                        {delivery.delivered_at && (
                          <p className="text-[10px] mt-1" style={{ color: theme.text_secondary }}>Delivered: {delivery.delivered_at}</p>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    {(delivery.status === 'Pending' || delivery.status === 'In Transit') && (
                      <div className="px-4 py-3 border-t flex flex-wrap gap-2" style={{ borderColor: theme.border_color }}>
                        {delivery.status === 'Pending' && (
                          <button
                            onClick={() => handleAction(delivery, 'In Transit')}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                            style={{ backgroundColor: '#3b82f6' }}
                          >
                            <Navigation size={14} /> Start Delivery
                          </button>
                        )}
                        {delivery.status === 'In Transit' && (
                          <button
                            onClick={() => handleAction(delivery, 'Delivered')}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                            style={{ backgroundColor: '#22c55e' }}
                          >
                            <CheckCircle size={14} /> Confirm Delivered
                          </button>
                        )}
                        <button
                          onClick={() => handleAction(delivery, 'Failed')}
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                          style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}
                        >
                          <XCircle size={14} /> Failed
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Action Confirmation Modal */}
      {actionModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setActionModal(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ border: `2px solid ${theme.border_color}` }}>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: statusConfig[actionModal.action].bg }}
                  >
                    {(() => {
                      const Icon = statusConfig[actionModal.action].icon;
                      return <Icon size={20} style={{ color: statusConfig[actionModal.action].color }} />;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold" style={{ color: theme.text_primary }}>
                      {actionModal.action === 'In Transit' ? 'Start Delivery' : actionModal.action === 'Delivered' ? 'Confirm Delivery' : 'Mark as Failed'}
                    </h3>
                    <p className="text-xs" style={{ color: theme.text_secondary }}>{actionModal.delivery.delivery_number}</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: '#f9fafb', border: `1px solid ${theme.border_color}` }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin size={12} style={{ color: theme.text_secondary }} />
                    <p className="text-xs font-medium" style={{ color: theme.text_primary }}>{actionModal.delivery.destination}</p>
                  </div>
                  <p className="text-[10px]" style={{ color: theme.text_secondary }}>
                    {actionModal.delivery.items.reduce((s, i) => s + i.quantity, 0)} sacks · ₱{actionModal.delivery.items.reduce((s, i) => s + i.total, 0).toLocaleString()}
                  </p>
                </div>

                {/* Notes input */}
                <div className="mb-4">
                  <label className="block text-xs font-medium mb-1" style={{ color: theme.text_secondary }}>
                    <MessageSquare size={12} className="inline mr-1" />
                    {actionModal.action === 'Failed' ? 'Reason for failure *' : 'Notes (optional)'}
                  </label>
                  <textarea
                    value={driverNotes}
                    onChange={(e) => setDriverNotes(e.target.value)}
                    placeholder={actionModal.action === 'Failed' ? 'Explain why delivery failed...' : 'Add any notes about this delivery...'}
                    className="w-full px-3 py-2 text-sm border-2 rounded-xl focus:outline-none transition-all resize-none"
                    style={{ borderColor: theme.border_color, color: theme.text_primary }}
                    onFocus={(e) => e.target.style.borderColor = theme.button_primary}
                    onBlur={(e) => e.target.style.borderColor = theme.border_color}
                    rows={3}
                    required={actionModal.action === 'Failed'}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setActionModal(null)}
                    className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ backgroundColor: '#f3f4f6', color: theme.text_secondary }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmAction}
                    disabled={actionModal.action === 'Failed' && !driverNotes.trim()}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: statusConfig[actionModal.action].color }}
                  >
                    <Send size={13} /> Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Deliveries;