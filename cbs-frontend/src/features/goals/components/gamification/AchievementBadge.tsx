import { cn } from '@/lib/utils';

export interface Achievement {
  id: string;
  icon: string;
  name: string;
  description: string;
  earned: boolean;
  earnedAt?: string;
  progress?: number; // 0-100
}

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
}

export function AchievementBadge({ achievement, size = 'md' }: AchievementBadgeProps) {
  const sizes = { sm: 'w-10 h-10 text-lg', md: 'w-14 h-14 text-2xl', lg: 'w-20 h-20 text-3xl' };

  return (
    <div className="flex flex-col items-center gap-1" title={achievement.description}>
      <div className={cn(
        'rounded-full flex items-center justify-center relative',
        sizes[size],
        achievement.earned ? 'bg-primary/10 ring-2 ring-primary' : 'bg-muted/50 ring-2 ring-muted grayscale opacity-50',
      )}>
        <span>{achievement.icon}</span>
        {!achievement.earned && achievement.progress != null && achievement.progress > 0 && (
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${achievement.progress * 2.89} ${289 - achievement.progress * 2.89}`} opacity={0.4} />
          </svg>
        )}
      </div>
      <span className={cn('text-[10px] font-medium text-center leading-tight max-w-[60px]',
        achievement.earned ? 'text-foreground' : 'text-muted-foreground'
      )}>{achievement.name}</span>
    </div>
  );
}
