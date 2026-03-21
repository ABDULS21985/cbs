import { useState } from 'react';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import { useAddContact } from '../hooks/useCustomers';
import type { AddContactPayload, ContactType } from '../types/customer';

const CONTACT_TYPES: { value: ContactType; label: string }[] = [
  { value: 'PHONE', label: 'Phone' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'FAX', label: 'Fax' },
  { value: 'SOCIAL', label: 'Social Media' },
];

interface AddContactDialogProps {
  customerId: number;
  onClose: () => void;
}

export function AddContactDialog({ customerId, onClose }: AddContactDialogProps) {
  const addContact = useAddContact();

  const [form, setForm] = useState<AddContactPayload>({
    contactType: 'PHONE',
    contactValue: '',
    label: '',
    isPrimary: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: keyof AddContactPayload, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.contactValue.trim()) errs.contactValue = 'Contact value is required';
    if (form.contactType === 'EMAIL' && form.contactValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactValue)) {
      errs.contactValue = 'Invalid email format';
    }
    if (form.contactType === 'PHONE' && form.contactValue && !/^\+?[\d\s-]{7,15}$/.test(form.contactValue)) {
      errs.contactValue = 'Invalid phone format (7-15 digits)';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await addContact.mutateAsync({ customerId, data: form });
      toast.success('Contact added');
      onClose();
    } catch {
      toast.error('Failed to add contact');
    }
  };

  const placeholder = form.contactType === 'EMAIL' ? 'user@example.com'
    : form.contactType === 'PHONE' ? '+2348012345678'
    : form.contactType === 'FAX' ? '+234-1-234-5678'
    : '@handle';

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Add Contact Method</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Contact Type *</label>
              <select className="w-full input text-sm" value={form.contactType} onChange={(e) => update('contactType', e.target.value)}>
                {CONTACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Contact Value *</label>
              <input className="w-full input text-sm" value={form.contactValue} onChange={(e) => update('contactValue', e.target.value)} placeholder={placeholder} />
              {errors.contactValue && <p className="text-xs text-red-600 mt-0.5">{errors.contactValue}</p>}
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Label</label>
              <input className="w-full input text-sm" value={form.label} onChange={(e) => update('label', e.target.value)} placeholder="e.g. Work, Personal" />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isPrimary} onChange={(e) => update('isPrimary', e.target.checked)} className="rounded" />
              Set as primary contact
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} disabled={addContact.isPending} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">Cancel</button>
            <button onClick={handleSubmit} disabled={addContact.isPending} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
              {addContact.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Add Contact
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
