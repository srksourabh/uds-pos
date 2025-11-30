import { useEffect, useState } from 'react';
import { offlineQueue } from '../lib/offline-queue';
import { WifiOff, Wifi, RefreshCw, AlertCircle, CheckCircle, X } from 'lucide-react';

export function OfflineQueueStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueStats, setQueueStats] = useState({ pending: 0, failed: 0, total: 0 });
  const [showDetails, setShowDetails] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(updateQueueStats, 1000);
    updateQueueStats();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const updateQueueStats = () => {
    const pending = offlineQueue.getPendingCount();
    const failed = offlineQueue.getFailedCount();
    const queue = offlineQueue.getQueue();
    setQueueStats({ pending, failed, total: queue.length });
  };

  const handleSync = async () => {
    setSyncing(true);
    await offlineQueue.processQueue();
    updateQueueStats();
    setSyncing(false);
  };

  const handleRetryFailed = () => {
    offlineQueue.retryFailed();
    updateQueueStats();
  };

  const handleClearFailed = () => {
    offlineQueue.clearFailed();
    updateQueueStats();
  };

  if (queueStats.total === 0 && isOnline) {
    return null;
  }

  return (
    <>
      <div
        onClick={() => setShowDetails(true)}
        className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg cursor-pointer transition-all ${
          isOnline
            ? queueStats.failed > 0
              ? 'bg-red-600 text-white'
              : 'bg-blue-600 text-white'
            : 'bg-gray-800 text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Wifi className="w-5 h-5" />
          ) : (
            <WifiOff className="w-5 h-5 animate-pulse" />
          )}
          <div className="text-sm">
            <div className="font-semibold">
              {isOnline ? 'Online' : 'Offline Mode'}
            </div>
            {queueStats.total > 0 && (
              <div className="text-xs opacity-90">
                {queueStats.pending} pending
                {queueStats.failed > 0 && `, ${queueStats.failed} failed`}
              </div>
            )}
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Sync Status</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${
                isOnline ? 'bg-green-50 border border-green-200' : 'bg-gray-100 border border-gray-300'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {isOnline ? (
                    <Wifi className="w-5 h-5 text-green-600" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-gray-600" />
                  )}
                  <span className="font-medium text-gray-900">
                    {isOnline ? 'Connected' : 'Offline'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {isOnline
                    ? 'Your device is connected to the internet'
                    : 'Working offline. Changes will sync when connection is restored'}
                </p>
              </div>

              {queueStats.total > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Queue Status</h4>

                  {queueStats.pending > 0 && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">
                          {queueStats.pending} Pending
                        </span>
                      </div>
                      {isOnline && (
                        <button
                          onClick={handleSync}
                          disabled={syncing}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {syncing ? 'Syncing...' : 'Sync Now'}
                        </button>
                      )}
                    </div>
                  )}

                  {queueStats.failed > 0 && (
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-red-900">
                            {queueStats.failed} Failed
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleRetryFailed}
                          className="flex-1 text-xs px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Retry All
                        </button>
                        <button
                          onClick={handleClearFailed}
                          className="flex-1 text-xs px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                          Clear Failed
                        </button>
                      </div>
                    </div>
                  )}

                  {queueStats.pending === 0 && queueStats.failed === 0 && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">
                        All synced
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-xs text-gray-500">
                  Actions performed offline will automatically sync when connection is restored.
                  Maximum 3 retry attempts per action.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
