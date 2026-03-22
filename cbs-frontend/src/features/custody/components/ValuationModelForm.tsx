import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDefineValuationModel } from '../hooks/useCustodyExt';
import type { ValuationModel } from '../types/valuation';

interface ValuationModelFormProps {
  onClose: () => void;
}

const INSTRUMENT_TYPES = ['BOND', 'EQUITY', 'FX_FORWARD', 'IRS', 'OPTION', 'STRUCTURED_PRODUCT', 'MUTUAL_FUND', 'PRIVATE_EQUITY', 'REAL_ESTATE', 'COMMODITY'];
const METHODOLOGIES = ['DISCOUNTED_CASH_FLOW', 'COMPARABLE_MARKET', 'BINOMIAL_TREE', 'BLACK_SCHOLES', 'MONTE_CARLO', 'NAV_BASED', 'MARK_TO_MARKET', 'MARK_TO_MODEL', 'DEALER_QUOTE'];
const FV_LEVELS = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'];
const CALIBRATION_FREQ = ['DAILY', 'WEEKLY', 'MONTHLY'];

export function ValuationModelForm({ onClose }: ValuationModelFormProps) {
  const defineModel = useDefineValuationModel();
  const [form, setForm] = useState({
    modelCode: '',
    modelName: '',
    instrumentType: 'BOND',
    valuationMethodology: 'MARK_TO_MARKET',
    fairValueHierarchy: 'LEVEL_1',
    calibrationFrequency: 'DAILY',
    ipvThresholdPct: 5,
    modelOwner: '',
  });

  const handleCodeChange = (value: string) => {
    setForm((f) => ({ ...f, modelCode: value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    defineModel.mutate(form as Partial<ValuationModel>, {
      onSuccess: () => { toast.success('Valuation model defined'); onClose(); },
      onError: () => toast.error('Failed to define model'),
    });
  };

  const isValid = form.modelCode.trim() && form.modelName.trim() && form.instrumentType;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        <h2 className="text-lg font-semibold mb-1">Define Valuation Model</h2>
        <p className="text-sm text-muted-foreground mb-4">Configure a new pricing/valuation model</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Model Code *</label>
              <input className="w-full mt-1 input font-mono uppercase" placeholder="e.g. FI_DCF_V1" value={form.modelCode} onChange={(e) => handleCodeChange(e.target.value)} required maxLength={30} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Model Name *</label>
              <input className="w-full mt-1 input" placeholder="e.g. Fixed Income DCF Model" value={form.modelName} onChange={(e) => setForm((f) => ({ ...f, modelName: e.target.value }))} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Instrument Type *</label>
              <select className="w-full mt-1 input" value={form.instrumentType} onChange={(e) => setForm((f) => ({ ...f, instrumentType: e.target.value }))}>
                {INSTRUMENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Methodology *</label>
              <select className="w-full mt-1 input" value={form.valuationMethodology} onChange={(e) => setForm((f) => ({ ...f, valuationMethodology: e.target.value }))}>
                {METHODOLOGIES.map((m) => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Fair Value Hierarchy</label>
              <select className="w-full mt-1 input" value={form.fairValueHierarchy} onChange={(e) => setForm((f) => ({ ...f, fairValueHierarchy: e.target.value }))}>
                {FV_LEVELS.map((l) => <option key={l} value={l}>{l.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Calibration Frequency</label>
              <select className="w-full mt-1 input" value={form.calibrationFrequency} onChange={(e) => setForm((f) => ({ ...f, calibrationFrequency: e.target.value }))}>
                {CALIBRATION_FREQ.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">IPV Threshold (%)</label>
              <input type="number" className="w-full mt-1 input" value={form.ipvThresholdPct} onChange={(e) => setForm((f) => ({ ...f, ipvThresholdPct: parseFloat(e.target.value) || 5 }))} min={0.1} max={50} step={0.1} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Model Owner</label>
              <input className="w-full mt-1 input" placeholder="e.g. Risk Analytics Team" value={form.modelOwner} onChange={(e) => setForm((f) => ({ ...f, modelOwner: e.target.value }))} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={!isValid || defineModel.isPending} className="btn-primary flex items-center gap-2">
              {defineModel.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {defineModel.isPending ? 'Defining...' : 'Define Model'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
