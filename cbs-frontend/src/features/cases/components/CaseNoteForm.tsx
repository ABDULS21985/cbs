import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { caseApi, type CaseNoteType } from '../api/caseApi';

interface Props {
  caseNumber: string;
}

const NOTE_TYPES: { value: CaseNoteType; label: string }[] = [
  { value: 'INTERNAL', label: 'Internal' },
  { value: 'CUSTOMER_VISIBLE', label: 'Customer-visible' },
  { value: 'ESCALATION', label: 'Escalation' },
  { value: 'SYSTEM', label: 'System' },
];

export function CaseNoteForm({ caseNumber }: Props) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [noteType, setNoteType] = useState<CaseNoteType>('INTERNAL');

  const addNoteMutation = useMutation({
    mutationFn: (content: string) => caseApi.addNote(caseNumber, content, noteType),
    onSuccess: () => {
      toast.success('Note added');
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => caseApi.addAttachment(caseNumber, file),
    onSuccess: () => { toast.success('Attachment uploaded'); queryClient.invalidateQueries({ queryKey: ['cases'] }); },
  });

  return (
    <div className="border-t pt-4 space-y-2">
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-muted-foreground">Note type:</label>
        <div className="flex gap-1">
          {NOTE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setNoteType(t.value)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${noteType === t.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder={noteType === 'CUSTOMER_VISIBLE' ? 'Add a customer-visible note...' : 'Add an internal note...'}
          className="flex-1 px-3 py-2 border rounded-md text-sm resize-none"
        />
        <div className="flex flex-col gap-1">
          <button
            onClick={() => note.trim() && addNoteMutation.mutate(note)}
            disabled={!note.trim() || addNoteMutation.isPending}
            className="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
          <label className="p-2 border rounded-md hover:bg-muted cursor-pointer">
            <Paperclip className="w-4 h-4" />
            <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadMutation.mutate(e.target.files[0])} />
          </label>
        </div>
      </div>
    </div>
  );
}
