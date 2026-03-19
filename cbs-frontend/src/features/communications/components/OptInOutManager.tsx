import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { communicationApi, type ChannelPreference } from '../api/communicationApi';

interface Props {
  customerId: number;
}

const categories = ['Marketing', 'Transactional', 'Security', 'Product Updates', 'Surveys'];
const channels = ['EMAIL', 'SMS', 'PUSH', 'LETTER'] as const;

export function OptInOutManager({ customerId }: Props) {
  const queryClient = useQueryClient();
  const { data: preferences = [] } = useQuery({
    queryKey: ['communications', 'preferences', customerId],
    queryFn: () => communicationApi.getPreferences(customerId),
  });

  const updateMutation = useMutation({
    mutationFn: (pref: ChannelPreference) => communicationApi.updatePreference(customerId, pref),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', 'preferences', customerId] });
      toast.success('Preference updated');
    },
  });

  const isEnabled = (channel: string, category: string) =>
    preferences.find((p) => p.channel === channel && p.category === category)?.enabled ?? true;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b">
        <h3 className="text-sm font-semibold">Communication Preferences</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Category</th>
              {channels.map((ch) => (
                <th key={ch} className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">{ch}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat} className="border-b last:border-0">
                <td className="px-4 py-2.5 text-sm">{cat}</td>
                {channels.map((ch) => (
                  <td key={ch} className="px-4 py-2.5 text-center">
                    <button
                      onClick={() => updateMutation.mutate({ channel: ch, category: cat, enabled: !isEnabled(ch, cat) })}
                      className={`w-10 h-5 rounded-full transition-colors relative ${isEnabled(ch, cat) ? 'bg-primary' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isEnabled(ch, cat) ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
