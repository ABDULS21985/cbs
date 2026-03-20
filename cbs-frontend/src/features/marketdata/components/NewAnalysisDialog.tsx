import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateAnalysis } from '../hooks/useMarketData';
import type { AnalysisType } from '../types';

export function NewAnalysisDialog({ onClose }: { onClose: () => void }) {
  const createAnalysis = useCreateAnalysis();
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: '',
    type: 'TECHNICAL' as AnalysisType,
    instrument: '',
    sector: '',
    summary: '',
  });

  useEffect(() => { firstInputRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAnalysis.mutate(
      { ...form, instrument: form.instrument || undefined, sector: form.sector || undefined },
      {
        onSuccess: () => { toast.success('Analysis created'); onClose(); },
        onError: () => toast.error('Failed to create analysis'),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="new-analysis-title">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted" aria-label="Close dialog"><X className="w-4 h-4" /></button>
        <h2 id="new-analysis-title" className="text-lg font-semibold mb-4">New Market Analysis</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="na-title" className="text-sm font-medium text-muted-foreground">Title</label>
            <input id="na-title" ref={firstInputRef} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          </div>
          <div>
            <label htmlFor="na-type" className="text-sm font-medium text-muted-foreground">Analysis Type</label>
            <select id="na-type" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AnalysisType }))}>
              <option value="TECHNICAL">Technical</option>
              <option value="FUNDAMENTAL">Fundamental</option>
              <option value="SECTOR">Sector</option>
              <option value="MACRO">Macro</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="na-instrument" className="text-sm font-medium text-muted-foreground">Instrument (optional)</label>
              <input id="na-instrument" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" value={form.instrument} onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))} placeholder="e.g. DANGCEM" />
            </div>
            <div>
              <label htmlFor="na-sector" className="text-sm font-medium text-muted-foreground">Sector (optional)</label>
              <input id="na-sector" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" value={form.sector} onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))} placeholder="e.g. Banking" />
            </div>
          </div>
          <div>
            <label htmlFor="na-summary" className="text-sm font-medium text-muted-foreground">Summary</label>
            <textarea id="na-summary" rows={3} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} required />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={createAnalysis.isPending} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {createAnalysis.isPending ? 'Creating\u2026' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
