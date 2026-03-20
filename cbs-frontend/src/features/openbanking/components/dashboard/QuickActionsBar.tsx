import { Plus, KeyRound, BarChart3, ShieldCheck } from 'lucide-react';

interface QuickActionsBarProps {
  onRegisterTpp: () => void;
  onCreateConsent: () => void;
  onViewAnalytics: () => void;
  onPsd2Audit: () => void;
}

export function QuickActionsBar({
  onRegisterTpp,
  onCreateConsent,
  onViewAnalytics,
  onPsd2Audit,
}: QuickActionsBarProps) {
  const actions = [
    { label: 'Register TPP', icon: Plus, onClick: onRegisterTpp },
    { label: 'Create Consent', icon: KeyRound, onClick: onCreateConsent },
    { label: 'View Analytics', icon: BarChart3, onClick: onViewAnalytics },
    { label: 'PSD2 Audit', icon: ShieldCheck, onClick: onPsd2Audit },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map(({ label, icon: Icon, onClick }) => (
        <button
          key={label}
          onClick={onClick}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-muted transition-colors"
        >
          <Icon className="w-4 h-4 text-muted-foreground" />
          {label}
        </button>
      ))}
    </div>
  );
}
