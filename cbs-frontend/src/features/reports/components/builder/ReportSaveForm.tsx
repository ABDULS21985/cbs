import { useState } from 'react';
import { Loader2, X, Plus, Play, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SaveFormData } from '../../hooks/useReportBuilder';

interface ReportSaveFormProps {
  onSave: (data: SaveFormData) => void;
  onSaveAndRun: (data: SaveFormData) => void;
  isSaving: boolean;
  schedule: import('../../api/reportBuilderApi').ScheduleType;
  scheduleTime?: string;
  scheduleDay?: string;
}

export function ReportSaveForm({ onSave, onSaveAndRun, isSaving, schedule, scheduleTime, scheduleDay }: ReportSaveFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [savedTo, setSavedTo] = useState<'MY_REPORTS' | 'SHARED' | 'DEPARTMENT'>('MY_REPORTS');
  const [enableEmail, setEnableEmail] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'PDF' | 'EXCEL' | 'CSV'>('PDF');
  const [saveToDocLib, setSaveToDocLib] = useState(false);
  const [nameError, setNameError] = useState('');

  function buildFormData(): SaveFormData {
    return {
      name,
      description,
      schedule,
      savedTo,
      deliveryEmails: enableEmail ? emails : undefined,
      exportFormat: enableEmail ? exportFormat : undefined,
      scheduleTime,
      scheduleDay,
      saveToDocumentLibrary: saveToDocLib,
    };
  }

  function validate() {
    if (!name.trim()) {
      setNameError('Report name is required');
      return false;
    }
    setNameError('');
    return true;
  }

  function handleSave() {
    if (!validate()) return;
    onSave(buildFormData());
  }

  function handleSaveAndRun() {
    if (!validate()) return;
    onSaveAndRun(buildFormData());
  }

  function addEmail() {
    const trimmed = emailInput.trim();
    if (!trimmed || emails.includes(trimmed)) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return;
    setEmails([...emails, trimmed]);
    setEmailInput('');
  }

  function removeEmail(email: string) {
    setEmails(emails.filter((e) => e !== email));
  }

  function handleEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail();
    }
  }

  const SAVE_TO_OPTIONS: { value: 'MY_REPORTS' | 'SHARED' | 'DEPARTMENT'; label: string }[] = [
    { value: 'MY_REPORTS', label: 'My Reports' },
    { value: 'SHARED', label: 'Shared Reports' },
    { value: 'DEPARTMENT', label: 'Department Reports' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-1.5">
          Report Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setNameError(''); }}
          placeholder="Enter report name..."
          className={cn(
            'w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30',
            nameError && 'border-red-500',
          )}
        />
        {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what this report shows..."
          rows={3}
          className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Save To</label>
        <div className="flex gap-2">
          {SAVE_TO_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSavedTo(opt.value)}
              className={cn(
                'flex-1 py-2 text-xs font-medium rounded-lg border transition-colors',
                savedTo === opt.value
                  ? 'border-primary bg-primary/5 text-primary dark:bg-primary/10'
                  : 'border-border hover:bg-muted',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enableEmail}
            onChange={(e) => setEnableEmail(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium">Email Delivery</span>
        </label>

        {enableEmail && (
          <div className="space-y-3 pl-6">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Recipients</label>
              <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg bg-background min-h-[40px]">
                {emails.map((email) => (
                  <span key={email} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                    {email}
                    <button onClick={() => removeEmail(email)} className="hover:text-primary/70">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={handleEmailKeyDown}
                  onBlur={addEmail}
                  placeholder={emails.length === 0 ? 'Add email addresses...' : 'Add more...'}
                  className="flex-1 min-w-[140px] text-xs bg-transparent outline-none placeholder:text-muted-foreground"
                />
                <button onClick={addEmail} className="text-muted-foreground hover:text-primary">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Press Enter or comma to add email</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Export Format</label>
              <div className="flex gap-2">
                {(['PDF', 'EXCEL', 'CSV'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setExportFormat(fmt)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                      exportFormat === fmt
                        ? 'border-primary bg-primary/5 text-primary dark:bg-primary/10'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={saveToDocLib}
          onChange={(e) => setSaveToDocLib(e.target.checked)}
          className="rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span className="text-sm">Save output to Document Library</span>
      </label>

      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Report
        </button>
        <button
          onClick={handleSaveAndRun}
          disabled={isSaving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Save & Run Now
        </button>
      </div>
    </div>
  );
}
