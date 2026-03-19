import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { CommunicationTimeline } from '../components/CommunicationTimeline';
import { ComposeMessageForm } from '../components/ComposeMessageForm';
import { DeliveryDashboard } from '../components/DeliveryDashboard';
import { communicationApi, type Communication } from '../api/communicationApi';

export function CommunicationCenterPage() {
  const queryClient = useQueryClient();
  const [selectedComm, setSelectedComm] = useState<Communication | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'compose' | 'dashboard'>('history');

  const { data: communications = [] } = useQuery({
    queryKey: ['communications', 'list'],
    queryFn: () => communicationApi.getAll(),
  });

  const sendMutation = useMutation({
    mutationFn: (data: Partial<Communication>) => communicationApi.send(data),
    onSuccess: () => { toast.success('Message sent'); queryClient.invalidateQueries({ queryKey: ['communications'] }); setActiveTab('history'); },
    onError: () => toast.error('Failed to send message'),
  });

  const scheduleMutation = useMutation({
    mutationFn: (data: Partial<Communication> & { scheduledAt: string }) => communicationApi.schedule(data),
    onSuccess: () => { toast.success('Message scheduled'); queryClient.invalidateQueries({ queryKey: ['communications'] }); setActiveTab('history'); },
    onError: () => toast.error('Failed to schedule message'),
  });

  const tabs = [
    { key: 'history', label: 'History' },
    { key: 'compose', label: 'Compose' },
    { key: 'dashboard', label: 'Dashboard' },
  ] as const;

  return (
    <>
      <PageHeader title="Communication Center" subtitle="Manage outbound communications to customers" />
      <div className="page-container space-y-6">
        <div className="flex gap-1 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'history' && (
          <CommunicationTimeline communications={communications} onItemClick={setSelectedComm} />
        )}

        {activeTab === 'compose' && (
          <ComposeMessageForm
            customerId={0}
            customerName=""
            onSend={(data) => sendMutation.mutate(data)}
            onSchedule={(data) => scheduleMutation.mutate(data)}
            isSending={sendMutation.isPending}
          />
        )}

        {activeTab === 'dashboard' && <DeliveryDashboard />}

        {selectedComm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedComm(null)}>
            <div className="bg-card rounded-lg border shadow-xl max-w-lg w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold">{selectedComm.subject || selectedComm.channel + ' Message'}</h3>
              <p className="text-xs text-muted-foreground mt-1">{selectedComm.channel} · {selectedComm.deliveryStatus}</p>
              <div className="mt-4 p-4 bg-muted/50 rounded-md text-sm whitespace-pre-wrap">{selectedComm.messageContent}</div>
              <button onClick={() => setSelectedComm(null)} className="mt-4 px-4 py-2 border rounded-md text-sm hover:bg-muted">Close</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
