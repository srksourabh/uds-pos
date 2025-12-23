import { Clock, AlertTriangle, CheckCircle, Timer } from 'lucide-react';
import type { Call } from '../lib/database.types';

interface SLAIndicatorProps {
  call: Call;
  showAgeing?: boolean;
  compact?: boolean;
}

/**
 * SLAIndicator component displays SLA status for a call
 * - Shows overdue warning if past SLA
 * - Shows time remaining if within SLA
 * - Color-coded based on urgency
 */
export function SLAIndicator({ call, showAgeing = false, compact = false }: SLAIndicatorProps) {
  // If no SLA is set, return null
  if (!call.sla_hours && !call.sla_due_date) {
    return null;
  }

  // Calculate time remaining
  const now = new Date();
  const dueDate = call.sla_due_date ? new Date(call.sla_due_date) : null;

  // Calculate ageing days from created_at
  const createdAt = new Date(call.created_at);
  const ageingDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  // Check if call is completed or cancelled
  const isResolved = call.status === 'completed' || call.status === 'cancelled';

  // If resolved, show completed status
  if (isResolved) {
    return (
      <div className={`flex items-center gap-1 ${compact ? 'text-xs' : 'text-sm'} text-gray-500`}>
        <CheckCircle className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
        <span>Resolved</span>
      </div>
    );
  }

  if (!dueDate) {
    return null;
  }

  const diffMs = dueDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const isOverdue = diffHours < 0;
  const hoursRemaining = Math.abs(diffHours);

  // Format time display
  const formatTime = (hours: number): string => {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes}m`;
    }
    if (hours < 24) {
      return `${Math.round(hours)}h`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  // Determine styling based on SLA status
  let bgColor: string;
  let textColor: string;
  let Icon: typeof Clock;

  if (isOverdue) {
    bgColor = 'bg-red-100';
    textColor = 'text-red-700';
    Icon = AlertTriangle;
  } else if (diffHours <= 4) {
    bgColor = 'bg-orange-100';
    textColor = 'text-orange-700';
    Icon = Timer;
  } else if (diffHours <= 12) {
    bgColor = 'bg-yellow-100';
    textColor = 'text-yellow-700';
    Icon = Clock;
  } else {
    bgColor = 'bg-green-100';
    textColor = 'text-green-700';
    Icon = CheckCircle;
  }

  const message = isOverdue
    ? `Overdue by ${formatTime(hoursRemaining)}`
    : `${formatTime(hoursRemaining)} remaining`;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${bgColor} ${textColor}`}>
        <Icon className="w-3 h-3" />
        <span className="text-xs font-medium">{message}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded ${bgColor} ${textColor}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      {showAgeing && (
        <div className="text-xs text-gray-500">
          Age: {ageingDays} day{ageingDays !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

/**
 * SLABadge - A simpler badge-style SLA indicator
 */
export function SLABadge({ call }: { call: Call }) {
  if (!call.sla_hours && !call.sla_due_date) {
    return <span className="text-xs text-gray-400">No SLA</span>;
  }

  const now = new Date();
  const dueDate = call.sla_due_date ? new Date(call.sla_due_date) : null;

  if (!dueDate || call.status === 'completed' || call.status === 'cancelled') {
    return null;
  }

  const diffMs = dueDate.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const isOverdue = diffHours < 0;

  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
        <AlertTriangle className="w-3 h-3" />
        SLA Breached
      </span>
    );
  }

  if (diffHours <= 4) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
        <Timer className="w-3 h-3" />
        Critical
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
      <CheckCircle className="w-3 h-3" />
      On Track
    </span>
  );
}

/**
 * AgeingIndicator - Shows how old a call is
 */
export function AgeingIndicator({ call, compact = false }: { call: Call; compact?: boolean }) {
  const now = new Date();
  const createdAt = new Date(call.created_at);
  const ageingDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  // Determine color based on ageing
  let textColor: string;
  if (ageingDays <= 1) {
    textColor = 'text-green-600';
  } else if (ageingDays <= 3) {
    textColor = 'text-yellow-600';
  } else if (ageingDays <= 7) {
    textColor = 'text-orange-600';
  } else {
    textColor = 'text-red-600';
  }

  if (compact) {
    return (
      <span className={`text-xs ${textColor}`}>
        {ageingDays}d
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-1 text-sm ${textColor}`}>
      <Clock className="w-4 h-4" />
      <span>{ageingDays} day{ageingDays !== 1 ? 's' : ''} old</span>
    </div>
  );
}
