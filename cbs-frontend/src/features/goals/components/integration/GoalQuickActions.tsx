import { useNavigate } from 'react-router-dom';
import { Target, Plus, Eye } from 'lucide-react';
import type { SavingsGoal } from '../../api/goalApi';

interface GoalAction {
  id: string;
  label: string;
  icon: typeof Target;
  action: () => void;
}

interface Props {
  goals: SavingsGoal[];
}

export function useGoalQuickActions(goals: SavingsGoal[]): GoalAction[] {
  const navigate = useNavigate();

  const actions: GoalAction[] = [
    { id: 'new-goal', label: 'Create new savings goal', icon: Plus, action: () => navigate('/accounts/goals/new') },
  ];

  goals.filter((g) => g.status === 'ACTIVE').forEach((g) => {
    actions.push({
      id: `view-${g.id}`,
      label: `View goal: ${g.name}`,
      icon: Eye,
      action: () => navigate(`/accounts/goals/${g.id}`),
    });
    actions.push({
      id: `contribute-${g.id}`,
      label: `Contribute to ${g.name}`,
      icon: Target,
      action: () => navigate(`/accounts/goals/${g.id}?action=contribute`),
    });
  });

  return actions;
}

export function GoalQuickActions({ goals }: Props) {
  const actions = useGoalQuickActions(goals);

  return (
    <div className="space-y-1">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <button key={a.id} onClick={a.action}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{a.label}</span>
          </button>
        );
      })}
    </div>
  );
}
