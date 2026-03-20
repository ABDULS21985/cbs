import { useState, useRef } from 'react';
import { X, Upload, Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useUploadIdentification } from '../hooks/useCustomers';

const ID_TYPES = [
  'NIN', 'INTERNATIONAL_PASSPORT', 'DRIVERS_LICENSE', 'VOTERS_CARD',
  'CERTIFICATE_OF_INCORPORATION', 'TIN_CERTIFICATE', 'BVN', 'UTILITY_BILL', 'BANK_REFERENCE',
];

const COUNTRIES = ['NG', 'GH', 'KE', 'ZA', 'US', 'GB', 'CA', 'AE'];
const ACCEPTED = '.pdf,.jpg,.jpeg,.png';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

interface DocumentUploadDialogProps {
  customerId: number;
  onClose: () => void;
}

export function DocumentUploadDialog({ customerId, onClose }: DocumentUploadDialogProps) {
  const upload = useUploadIdentification();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [form, setForm] = useState({
    idType: 'NIN',
    idNumber: '',
    issueDate: '',
    expiryDate: '',
    issuingAuthority: '',
    issuingCountry: 'NG',
  });

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_SIZE) { toast.error('File too large (max 5MB)'); return; }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(f.type)) { toast.error('Only PDF, JPG, PNG allowed'); return; }
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      idType: form.idType,
      idNumber: form.idNumber,
      ...(form.issueDate && { issueDate: form.issueDate }),
      ...(form.expiryDate && { expiryDate: form.expiryDate }),
      ...(form.issuingAuthority && { issuingAuthority: form.issuingAuthority }),
      ...(form.issuingCountry && { issuingCountry: form.issuingCountry }),
    };
    upload.mutate({ customerId, data, file: file ?? undefined }, {
      onSuccess: () => { toast.success('Document uploaded successfully'); onClose(); },
      onError: () => toast.error('Failed to upload document'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-1">Upload Document</h2>
        <p className="text-sm text-muted-foreground mb-4">Add an identification document for this customer</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Document Type *</label>
              <select className="w-full mt-1 input" value={form.idType} onChange={(e) => setForm((f) => ({ ...f, idType: e.target.value }))}>
                {ID_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Document Number *</label>
              <input className="w-full mt-1 input font-mono" placeholder="e.g. 12345678901" value={form.idNumber} onChange={(e) => setForm((f) => ({ ...f, idNumber: e.target.value }))} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Issue Date</label>
              <input type="date" className="w-full mt-1 input" value={form.issueDate} onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Expiry Date</label>
              <input type="date" className="w-full mt-1 input" value={form.expiryDate} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} min={new Date().toISOString().split('T')[0]} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Issuing Authority</label>
              <input className="w-full mt-1 input" placeholder="e.g. NIMC" value={form.issuingAuthority} onChange={(e) => setForm((f) => ({ ...f, issuingAuthority: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Issuing Country</label>
              <select className="w-full mt-1 input" value={form.issuingCountry} onChange={(e) => setForm((f) => ({ ...f, issuingCountry: e.target.value }))}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* File upload */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Document File</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
                dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
              )}
            >
              <input ref={fileRef} type="file" accept={ACCEPTED} className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div className="text-left">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="p-1 rounded hover:bg-muted">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Drop file here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (max 5MB)</p>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={!form.idNumber.trim() || upload.isPending} className="btn-primary flex items-center gap-2">
              {upload.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {upload.isPending ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
