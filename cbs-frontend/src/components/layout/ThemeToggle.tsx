import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/app/providers';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  collapsed?: boolean;
}

export function ThemeToggle({ collapsed }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  const Icon = theme === 'dark' ? Moon : theme === 'system' ? Monitor : Sun;

  return (
    <button
      onClick={() => setTheme(next)}
      className={cn(
        'gloss-pill flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-300 transition-colors hover:text-white',
      )}
      title={`Theme: ${theme} (click for ${next})`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && <span className="capitalize">{theme} mode</span>}
    </button>
  );
}
