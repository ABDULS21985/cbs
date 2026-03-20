import { useState } from 'react';
import { Pencil, Save, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePatchCustomer } from '../hooks/useCustomerIntelligence';
import type { Customer } from '../types/customer';
import { toast } from 'sonner';
import { z } from 'zod';

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const personalSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  maritalStatus: z.string().optional(),
});

const contactSchema = z.object({
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().regex(/^\+?[\d\s-]{7,15}$/, 'Invalid phone format').optional().or(z.literal('')),
  preferredLanguage: z.string().optional(),
  preferredChannel: z.string().optional(),
});

const employmentSchema = z.object({
  employerName: z.string().optional(),
  occupation: z.string().optional(),
});

const riskSchema = z.object({
  riskRating: z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']),
  justification: z.string().min(10, 'Justification required (min 10 chars)'),
});

const rmSchema = z.object({
  relationshipManager: z.string().min(1, 'RM name required'),
});

type SectionId = 'personal' | 'contact' | 'employment' | 'risk' | 'rm';

interface EditableSectionProps {
  sectionId: SectionId;
  title: string;
  customer: Customer;
  children: React.ReactNode;
  onSave: (sectionId: SectionId, data: Record<string, unknown>) => Promise<void>;
  isSaving: boolean;
}

export function EditableSection({ sectionId, title, customer, children, onSave, isSaving }: EditableSectionProps) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const startEditing = () => {
    const defaults: Record<SectionId, Record<string, unknown>> = {
      personal: {
        firstName: customer.firstName ?? '', middleName: customer.middleName ?? '',
        lastName: customer.lastName ?? '', dateOfBirth: customer.dateOfBirth ?? '',
        gender: customer.gender ?? '', nationality: customer.nationality ?? '',
        maritalStatus: customer.maritalStatus ?? '',
      },
      contact: {
        email: customer.email ?? '', phone: customer.phone ?? '',
        preferredLanguage: customer.preferredLanguage ?? '', preferredChannel: customer.preferredChannel ?? '',
      },
      employment: {
        employerName: customer.employerName ?? '', occupation: customer.occupation ?? '',
      },
      risk: { riskRating: customer.riskRating ?? 'MEDIUM', justification: '' },
      rm: { relationshipManager: customer.relationshipManager ?? '' },
    };
    setFormData(defaults[sectionId] || {});
    setErrors({});
    setEditing(true);
  };

  const validate = (): boolean => {
    const schemas: Record<SectionId, z.ZodType<any>> = {
      personal: personalSchema,
      contact: contactSchema,
      employment: employmentSchema,
      risk: riskSchema,
      rm: rmSchema,
    };
    const result = schemas[sectionId].safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path.join('.');
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      await onSave(sectionId, formData);
      setEditing(false);
      toast.success(`${title} updated`);
    } catch (err: any) {
      if (err?.message?.includes('version') || err?.message?.includes('conflict')) {
        toast.error('Modified by another user. Please refresh and try again.');
      } else {
        toast.error('Failed to save changes');
      }
    }
  };

  const updateField = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  };

  if (!editing) {
    return (
      <div className="group relative">
        <button
          onClick={startEditing}
          className="absolute top-0 right-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
          title={`Edit ${title}`}
        >
          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        {children}
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-primary">Editing: {title}</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg border hover:bg-muted" disabled={isSaving}>
            <X className="w-3 h-3" /> Cancel
          </button>
          <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            <Save className="w-3 h-3" /> {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Object.entries(formData).map(([field, value]) => (
          <div key={field}>
            <label className="text-xs text-muted-foreground block mb-1">{field.replace(/([A-Z])/g, ' $1').trim()}</label>
            {field === 'gender' ? (
              <select className="w-full input text-sm" value={String(value)} onChange={(e) => updateField(field, e.target.value)}>
                <option value="">Select...</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            ) : field === 'riskRating' ? (
              <select className="w-full input text-sm" value={String(value)} onChange={(e) => updateField(field, e.target.value)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="VERY_HIGH">Very High</option>
              </select>
            ) : field === 'preferredChannel' ? (
              <select className="w-full input text-sm" value={String(value)} onChange={(e) => updateField(field, e.target.value)}>
                <option value="">Select...</option>
                <option value="BRANCH">Branch</option>
                <option value="MOBILE">Mobile</option>
                <option value="INTERNET">Internet</option>
                <option value="ATM">ATM</option>
              </select>
            ) : field === 'dateOfBirth' ? (
              <input type="date" className="w-full input text-sm" value={String(value)} onChange={(e) => updateField(field, e.target.value)} />
            ) : (
              <input className="w-full input text-sm" value={String(value)} onChange={(e) => updateField(field, e.target.value)} />
            )}
            {errors[field] && (
              <p className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {errors[field]}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
