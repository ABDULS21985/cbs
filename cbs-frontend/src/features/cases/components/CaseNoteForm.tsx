import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { caseApi } from '../api/caseApi';

interface Props {
  caseNumber: string;
}

export function CaseNoteForm({ caseNumber }: Props) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');

  const addNoteMutation = useMutation({
    mutationFn: (content: string) => caseApi.addNote(caseNumber, content),
    onSuccess: () => { toast.success('Note added'); setNote(''); queryClient.invalidateQueries({ queryKey: ['cases'] }); },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => caseApi.addAttachment(caseNumber, file),
    onSuccess: () => { toast.success('Attachment uploaded'); queryClient.invalidateQueries({ queryKey: ['cases'] }); },
  });

  return (
    <div className="border-t pt-4">
      <div className="flex gap-2">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Add a note..."
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
