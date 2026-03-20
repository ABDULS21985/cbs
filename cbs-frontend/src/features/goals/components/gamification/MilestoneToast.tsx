import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface MilestoneToastProps {
  icon: string;
  title: string;
  description: string;
  show: boolean;
  onDismiss: () => void;
}

export function MilestoneToast({ icon, title, description, show, onDismiss }: MilestoneToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, onDismiss]);

  if (!show && !visible) return null;

  return (
    <div className={cn(
      'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300',
      visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
    )}>
      <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-card border shadow-2xl min-w-[300px]">
        <span className="text-3xl animate-bounce">{icon}</span>
        <div>
          <p className="text-sm font-bold text-primary">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}
