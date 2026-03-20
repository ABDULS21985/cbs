import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { usePublishResearch } from '../hooks/useMarketData';
import type { Recommendation } from '../types';

export function PublishResearchDialog({ onClose }: { onClose: () => void }) {
  const publishResearch = usePublishResearch();
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: '',
    instrumentCode: '',
    analyst: '',
    recommendation: 'HOLD' as Recommendation,
    targetPrice: '',
    summary: '',
    reportUrl: '',
  });

  useEffect(() => { firstInputRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    publishResearch.mutate(
      {
        ...form,
        targetPrice: parseFloat(form.targetPrice) || 0,
        reportUrl: form.reportUrl || undefined,
      },
      {
        onSuccess: () => { toast.success('Research published'); onClose(); },
        onError: () => toast.error('Failed to publish research'),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="pub-research-title">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted" aria-label="Close dialog">
          <X className="w-4 h-4" />
        </button>
        <h2 id="pub-research-title" className="text-lg font-semibold mb-4">Publish Research Report</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="pr-title" className="text-sm font-medium text-muted-foreground">Title</label>
            <input id="pr-title" ref={firstInputRef} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="pr-instrument" className="text-sm font-medium text-muted-foreground">Instrument Code</label>
              <input id="pr-instrument" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" value={form.instrumentCode} onChange={(e) => setForm((f) => ({ ...f, instrumentCode: e.target.value }))} placeholder="e.g. DANGCEM" required />
            </div>
            <div>
              <label htmlFor="pr-analyst" className="text-sm font-medium text-muted-foreground">Analyst</label>
              <input id="pr-analyst" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" value={form.analyst} onChange={(e) => setForm((f) => ({ ...f, analyst: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="pr-rec" className="text-sm font-medium text-muted-foreground">Recommendation</label>
              <select id="pr-rec" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" value={form.recommendation} onChange={(e) => setForm((f) => ({ ...f, recommendation: e.target.value as Recommendation }))}>
                <option value="BUY">BUY</option>
                <option value="HOLD">HOLD</option>
                <option value="SELL">SELL</option>
              </select>
            </div>
            <div>
              <label htmlFor="pr-target" className="text-sm font-medium text-muted-foreground">Target Price</label>
              <input id="pr-target" type="number" step="0.01" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" value={form.targetPrice} onChange={(e) => setForm((f) => ({ ...f, targetPrice: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label htmlFor="pr-summary" className="text-sm font-medium text-muted-foreground">Summary</label>
            <textarea id="pr-summary" rows={3} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} required />
          </div>
          <div>
            <label htmlFor="pr-url" className="text-sm font-medium text-muted-foreground">Report URL (optional)</label>
            <input id="pr-url" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" value={form.reportUrl} onChange={(e) => setForm((f) => ({ ...f, reportUrl: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" disabled={publishResearch.isPending} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {publishResearch.isPending ? 'Publishing\u2026' : 'Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
