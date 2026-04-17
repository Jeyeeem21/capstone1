/**
 * Offline Banner
 * 
 * Persistent banner shown at the top of every page when offline.
 * Shows sync progress when reconnecting.
 * Shows success confirmation after sync completes.
 */

import { WifiOff, Wifi, RefreshCw, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { useOffline } from '../../pwa/OfflineContext';

export default function OfflineBanner() {
  const {
    isOnline,
    pendingCount,
    isSyncing,
    syncProgress,
    lastSyncResult,
    conflicts,
    triggerSync,
    dismissConflict,
  } = useOffline();

  // Nothing to show when online with no pending items and no recent sync
  if (isOnline && pendingCount === 0 && !isSyncing && !lastSyncResult && conflicts.length === 0) {
    return null;
  }

  return (
    <div className="w-full z-[100]">
      {/* OFFLINE BANNER */}
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <WifiOff size={18} className="flex-shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-sm">You are currently OFFLINE</span>
              <span className="text-amber-100 text-xs ml-2 hidden sm:inline">
                Your changes are saved locally and will sync automatically when internet is restored.
              </span>
            </div>
          </div>
          {pendingCount > 0 && (
            <span className="bg-amber-600 text-white text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0">
              {pendingCount} pending
            </span>
          )}
        </div>
      )}

      {/* SYNCING BANNER */}
      {isOnline && isSyncing && syncProgress && (
        <div className="bg-blue-500 text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <RefreshCw size={18} className="flex-shrink-0 animate-spin" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-sm">
                Internet restored! Syncing {syncProgress.current}/{syncProgress.total} changes...
              </span>
              {syncProgress.action && (
                <span className="text-blue-100 text-xs ml-2 hidden sm:inline">
                  {syncProgress.action}
                </span>
              )}
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-32 bg-blue-600 rounded-full h-2 flex-shrink-0 hidden sm:block">
            <div
              className="bg-white rounded-full h-2 transition-all duration-300"
              style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* SYNC COMPLETE BANNER */}
      {isOnline && !isSyncing && lastSyncResult && (
        <div className="bg-green-500 text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <CheckCircle size={18} className="flex-shrink-0" />
            <span className="font-semibold text-sm">
              All changes synced successfully!
              {lastSyncResult.synced > 0 && ` (${lastSyncResult.synced} synced)`}
            </span>
          </div>
        </div>
      )}

      {/* PENDING (Online but has unsynced items) */}
      {isOnline && !isSyncing && !lastSyncResult && pendingCount > 0 && (
        <div className="bg-amber-500 text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <RefreshCw size={18} className="flex-shrink-0" />
            <span className="font-semibold text-sm">
              {pendingCount} changes pending sync
            </span>
          </div>
          <button
            onClick={triggerSync}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1 rounded transition-colors"
          >
            Sync Now
          </button>
        </div>
      )}

      {/* CONFLICT BANNERS */}
      {conflicts.map((conflict, index) => (
        <div
          key={index}
          className="bg-red-500 text-white px-4 py-2 flex items-center justify-between gap-3 shadow-md"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="flex-shrink-0" />
            <span className="text-sm">
              <span className="font-semibold">Sync conflict:</span> {conflict.action} — {conflict.error}
            </span>
          </div>
          <button
            onClick={() => dismissConflict(index)}
            className="text-white/80 hover:text-white flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
