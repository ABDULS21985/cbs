import { useState } from 'react';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import { useAddAddress, useUpdateAddress } from '../hooks/useCustomers';
import type { AddAddressPayload, AddressType, CustomerAddress } from '../types/customer';

const ADDRESS_TYPES: { value: AddressType; label: string }[] = [
  { value: 'RESIDENTIAL', label: 'Residential' },
  { value: 'OFFICE', label: 'Office' },
  { value: 'REGISTERED', label: 'Registered' },
  { value: 'MAILING', label: 'Mailing' },
  { value: 'NEXT_OF_KIN', label: 'Next of Kin' },
];

interface AddAddressDialogProps {
  customerId: number;
  existing?: CustomerAddress;
  onClose: () => void;
}

export function AddAddressDialog({ customerId, existing, onClose }: AddAddressDialogProps) {
  const isEdit = !!existing;
  const addAddress = useAddAddress();
  const updateAddress = useUpdateAddress();
  const isPending = addAddress.isPending || updateAddress.isPending;

  const [form, setForm] = useState<AddAddressPayload>({
    addressType: (existing?.addressType as AddressType) ?? 'RESIDENTIAL',
    addressLine1: existing?.addressLine1 ?? '',
    addressLine2: existing?.addressLine2 ?? '',
    city: existing?.city ?? '',
    state: existing?.state ?? '',
    country: existing?.country ?? 'NGA',
    postalCode: existing?.postalCode ?? '',
    district: existing?.district ?? '',
    landmark: existing?.landmark ?? '',
    isPrimary: existing?.isPrimary ?? false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: keyof AddAddressPayload, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.addressLine1.trim()) errs.addressLine1 = 'Address line 1 is required';
    if (!form.city.trim()) errs.city = 'City is required';
    if (!form.country.trim()) errs.country = 'Country is required';
    if (form.country && form.country.length !== 3) errs.country = 'Must be a 3-letter ISO code';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      if (isEdit && existing) {
        await updateAddress.mutateAsync({ customerId, addressId: existing.id, data: form });
        toast.success('Address updated');
      } else {
        await addAddress.mutateAsync({ customerId, data: form });
        toast.success('Address added');
      }
      onClose();
    } catch {
      toast.error(`Failed to ${isEdit ? 'update' : 'add'} address`);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{isEdit ? 'Edit Address' : 'Add Address'}</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs text-muted-foreground block mb-1">Address Type *</label>
              <select className="w-full input text-sm" value={form.addressType} onChange={(e) => update('addressType', e.target.value)}>
                {ADDRESS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isPrimary} onChange={(e) => update('isPrimary', e.target.checked)} className="rounded" />
                Primary Address
              </label>
            </div>

            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Address Line 1 *</label>
              <input className="w-full input text-sm" value={form.addressLine1} onChange={(e) => update('addressLine1', e.target.value)} placeholder="Street address" />
              {errors.addressLine1 && <p className="text-xs text-red-600 mt-0.5">{errors.addressLine1}</p>}
            </div>

            <div className="col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Address Line 2</label>
              <input className="w-full input text-sm" value={form.addressLine2} onChange={(e) => update('addressLine2', e.target.value)} placeholder="Apartment, suite, unit" />
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">City *</label>
              <input className="w-full input text-sm" value={form.city} onChange={(e) => update('city', e.target.value)} />
              {errors.city && <p className="text-xs text-red-600 mt-0.5">{errors.city}</p>}
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">State</label>
              <input className="w-full input text-sm" value={form.state} onChange={(e) => update('state', e.target.value)} />
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Country (ISO 3) *</label>
              <input className="w-full input text-sm" value={form.country} onChange={(e) => update('country', e.target.value.toUpperCase())} maxLength={3} placeholder="NGA" />
              {errors.country && <p className="text-xs text-red-600 mt-0.5">{errors.country}</p>}
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Postal Code</label>
              <input className="w-full input text-sm" value={form.postalCode} onChange={(e) => update('postalCode', e.target.value)} />
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">District</label>
              <input className="w-full input text-sm" value={form.district} onChange={(e) => update('district', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Landmark</label>
              <input className="w-full input text-sm" value={form.landmark} onChange={(e) => update('landmark', e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} disabled={isPending} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">Cancel</button>
            <button onClick={handleSubmit} disabled={isPending} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEdit ? 'Update' : 'Add'} Address
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
