import { useState } from 'react';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import { useAddNote } from '../hooks/useCustomers';
import type { AddNotePayload, NoteType } from '../types/customer';

const NOTE_TYPES: { value: NoteType; label: string }[] = [
  { value: 'GENERAL', label: 'General' },
  { value: 'COMPLAINT', label: 'Complaint' },
  { value: 'INTERACTION', label: 'Interaction' },
  { value: 'KYC', label: 'KYC' },
  { value: 'RISK', label: 'Risk' },
  { value: 'INTERNAL', label: 'Internal' },
];

interface AddNoteDialogProps {
  customerId: number;
  onClose: () => void;
}

export function AddNoteDialog({ customerId, onClose }: AddNoteDialogProps) {
  const addNote = useAddNote();

  const [form, setForm] = useState<AddNotePayload>({
    noteType: 'GENERAL',
    subject: '',
    content: '',
    isPinned: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: keyof AddNotePayload, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.content.trim()) errs.content = 'Note content is required';
    if (form.subject && form.subject.length > 200) errs.subject = 'Subject must be 200 characters or less';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await addNote.mutateAsync({ customerId, data: form });
      toast.success('Note added');
      onClose();
    } catch {
      toast.error('Failed to add note');
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Add Note</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Note Type</label>
              <select className="w-full input text-sm" value={form.noteType} onChange={(e) => update('noteType', e.target.value)}>
                {NOTE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Subject</label>
              <input className="w-full input text-sm" value={form.subject} onChange={(e) => update('subject', e.target.value)} placeholder="Brief summary" maxLength={200} />
              {errors.subject && <p className="text-xs text-red-600 mt-0.5">{errors.subject}</p>}
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Content *</label>
              <textarea className="w-full input text-sm min-h-[120px] resize-y" value={form.content} onChange={(e) => update('content', e.target.value)} placeholder="Enter note details..." />
              {errors.content && <p className="text-xs text-red-600 mt-0.5">{errors.content}</p>}
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isPinned} onChange={(e) => update('isPinned', e.target.checked)} className="rounded" />
              Pin this note
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} disabled={addNote.isPending} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">Cancel</button>
            <button onClick={handleSubmit} disabled={addNote.isPending} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
              {addNote.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Add Note
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
