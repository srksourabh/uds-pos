import { useAlerts } from '../lib/api-hooks';
import { AlertTriangle, Bell, CheckCircle, Info, XCircle } from 'lucide-react';

export function Alerts() {
  const { data: alerts, loading } = useAlerts();

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      low: 'bg-blue-100 text-blue-800 border-blue-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-red-100 text-red-800 border-red-200',
      critical: 'bg-purple-100 text-purple-800 border-purple-200',
    };
    return colors[severity] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low':
        return <Info className="w-5 h-5" />;
      case 'medium':
        return <Bell className="w-5 h-5" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5" />;
      case 'critical':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      low_stock: 'Low Stock',
      device_faulty: 'Device Faulty',
      overdue_call: 'Overdue Call',
      no_stock: 'Out of Stock',
      engineer_overload: 'Engineer Overload',
    };
    return labels[type] || type;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2-responsive text-gray-900">Alerts & Notifications</h1>
          <p className="text-gray-600 mt-1">System alerts and important notifications</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          Real-time monitoring active
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(['low', 'medium', 'high', 'critical'] as const).map((severity) => {
          const count = alerts.filter((a: any) => a.severity === severity).length;
          return (
            <div key={severity} className={`p-4 rounded-lg border-2 ${getSeverityColor(severity)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getSeverityIcon(severity)}
                  <span className="font-medium capitalize">{severity}</span>
                </div>
                <span className="heading-2-responsive">{count}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No active alerts</p>
            <p className="text-gray-500 text-sm mt-1">All systems are operating normally</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {alerts.map((alert: any) => (
              <div key={alert.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity)}`}>
                    {getSeverityIcon(alert.severity)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="heading-3-responsive text-gray-900">{alert.title}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getSeverityColor(alert.severity)}`}>
                            {getAlertTypeLabel(alert.alert_type)}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm">{alert.message}</p>
                      </div>
                      <span className="text-sm text-gray-500 whitespace-nowrap">{formatDate(alert.created_at)}</span>
                    </div>

                    {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.entries(alert.metadata).map(([key, value]: any) => (
                            <div key={key} className="text-sm">
                              <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}:</span>
                              <span className="ml-2 font-medium text-gray-900">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {alert.entity_type && alert.entity_id && (
                      <div className="mt-3 flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Related to:</span>
                        <a
                          href={`/${alert.entity_type}s/${alert.entity_id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium underline"
                        >
                          View {alert.entity_type}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
