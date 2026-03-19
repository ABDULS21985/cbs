import { MessageSquare, ArrowRightLeft, AlertTriangle, Paperclip, CheckCircle, RefreshCw } from 'lucide-react';
import { formatDateTime } from '@/lib/formatters';
import type { CaseActivity } from '../api/caseApi';

const activityIcons = {
  NOTE: MessageSquare,
  STATUS_CHANGE: RefreshCw,
  ASSIGNMENT: ArrowRightLeft,
  ESCALATION: AlertTriangle,
  ATTACHMENT: Paperclip,
  RESOLUTION: CheckCircle,
};

const activityColors = {
  NOTE: 'bg-blue-100 text-blue-600',
  STATUS_CHANGE: 'bg-gray-100 text-gray-600',
  ASSIGNMENT: 'bg-purple-100 text-purple-600',
  ESCALATION: 'bg-amber-100 text-amber-600',
  ATTACHMENT: 'bg-gray-100 text-gray-600',
  RESOLUTION: 'bg-green-100 text-green-600',
};

interface Props {
  activities: CaseActivity[];
}

export function CaseActivityFeed({ activities }: Props) {
  if (!activities.length) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No activity yet</p>;
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, idx) => {
        const Icon = activityIcons[activity.type] || MessageSquare;
        const colorClass = activityColors[activity.type] || 'bg-gray-100 text-gray-600';
        return (
          <div key={activity.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              {idx < activities.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
            </div>
            <div className="pb-4 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{activity.createdBy}</span>
                <span className="text-xs text-muted-foreground">{formatDateTime(activity.createdAt)}</span>
              </div>
              {activity.type === 'STATUS_CHANGE' && activity.previousValue && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Changed status: {activity.previousValue} → {activity.newValue}
                </p>
              )}
              <p className="text-sm mt-1 whitespace-pre-wrap">{activity.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
