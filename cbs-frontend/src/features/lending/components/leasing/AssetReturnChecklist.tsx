import { useState } from 'react';
import { CheckSquare } from 'lucide-react';

interface AssetReturnChecklistProps {
  leaseId?: number;
  onSubmit?: (data: ReturnData) => void;
}

interface ReturnData {
  condition: 'GOOD' | 'FAIR' | 'POOR';
  accessoriesPresent: boolean;
  damageAssessment: string;
  usageReading: string;
  returnDate: string;
}

export function AssetReturnChecklist({ onSubmit }: AssetReturnChecklistProps) {
  const [condition, setCondition] = useState<'GOOD' | 'FAIR' | 'POOR'>('GOOD');
  const [accessoriesPresent, setAccessoriesPresent] = useState(true);
  const [damageAssessment, setDamageAssessment] = useState('');
  const [usageReading, setUsageReading] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: ReturnData = {
      condition,
      accessoriesPresent,
      damageAssessment,
      usageReading,
      returnDate,
    };
    onSubmit?.(data);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-card border rounded-lg p-5 flex flex-col items-center gap-3 text-center">
        <CheckSquare className="w-10 h-10 text-green-600" />
        <p className="text-sm font-semibold text-green-700">Asset return confirmed</p>
        <button
          onClick={() => setSubmitted(false)}
          className="text-xs text-primary hover:underline"
        >
          Reset form
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border rounded-lg p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Asset Return Checklist</h3>

      {/* Physical condition */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Physical Condition Assessment
        </label>
        <div className="flex gap-4">
          {(['GOOD', 'FAIR', 'POOR'] as const).map((opt) => (
            <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="condition"
                value={opt}
                checked={condition === opt}
                onChange={() => setCondition(opt)}
                className="text-primary"
              />
              <span className={`text-sm font-medium ${opt === 'GOOD' ? 'text-green-700' : opt === 'FAIR' ? 'text-amber-700' : 'text-red-700'}`}>
                {opt.charAt(0) + opt.slice(1).toLowerCase()}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Accessories */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={accessoriesPresent}
            onChange={(e) => setAccessoriesPresent(e.target.checked)}
            className="rounded text-primary"
          />
          <span className="text-sm">All accessories and components present</span>
        </label>
      </div>

      {/* Damage assessment */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
          Damage Assessment
        </label>
        <textarea
          value={damageAssessment}
          onChange={(e) => setDamageAssessment(e.target.value)}
          rows={3}
          placeholder="Describe any damage observed..."
          className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      {/* Usage reading */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
          Odometer / Usage Reading
        </label>
        <input
          type="number"
          value={usageReading}
          onChange={(e) => setUsageReading(e.target.value)}
          placeholder="e.g. 45230"
          min={0}
          className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
        />
      </div>

      {/* Return date */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
          Return Date
        </label>
        <input
          type="date"
          value={returnDate}
          onChange={(e) => setReturnDate(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          required
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!returnDate}
          className="px-6 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          Confirm Asset Return
        </button>
      </div>
    </form>
  );
}
