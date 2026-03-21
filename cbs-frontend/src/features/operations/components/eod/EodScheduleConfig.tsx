import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, Loader2, Settings } from 'lucide-react';
import { FormSection } from '@/components/shared';
import { cn } from '@/lib/utils';
import type { EodScheduleConfig as EodScheduleConfigType } from '../../api/eodApi';

const schema = z.object({
  autoTrigger: z.boolean(),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  blockIfUnclosedBranches: z.boolean(),
  autoRetry: z.boolean(),
  maxRetries: z.number().int().min(1).max(10),
});

type FormValues = z.infer<typeof schema>;

interface EodScheduleConfigProps {
  open: boolean;
  onClose: () => void;
  config: EodScheduleConfigType | null;
  onSave: (config: EodScheduleConfigType) => Promise<void>;
  isSaving?: boolean;
}

export function EodScheduleConfig({ open, onClose, config, onSave, isSaving }: EodScheduleConfigProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      autoTrigger: config?.autoTrigger ?? false,
      scheduledTime: config?.scheduledTime ?? '22:00',
      blockIfUnclosedBranches: config?.blockIfUnclosedBranches ?? true,
      autoRetry: config?.autoRetry ?? false,
      maxRetries: config?.maxRetries ?? 3,
    },
  });

  const autoRetry = watch('autoRetry');

  useEffect(() => {
    if (config) {
      reset({
        autoTrigger: config.autoTrigger,
        scheduledTime: config.scheduledTime,
        blockIfUnclosedBranches: config.blockIfUnclosedBranches,
        autoRetry: config.autoRetry,
        maxRetries: config.maxRetries,
      });
      setEmails(config.notificationEmails ? config.notificationEmails.split(',').map(e => e.trim()).filter(Boolean) : []);
    }
  }, [config, reset]);

  const handleAddEmail = () => {
    const val = emailInput.trim();
    if (!val) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setEmailError('Invalid email address');
      return;
    }
    if (emails.includes(val)) {
      setEmailError('Email already added');
      return;
    }
    setEmails((prev) => [...prev, val]);
    setEmailInput('');
    setEmailError('');
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const handleRemoveEmail = (email: string) => {
    setEmails((prev) => prev.filter((e) => e !== email));
  };

  const onSubmit = async (values: FormValues) => {
    await onSave({
      ...values,
      notificationEmails: emails.length > 0 ? emails.join(',') : null,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-lg max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-base font-semibold">EOD Schedule Configuration</h3>
            </div>
            <button
              onClick={onClose}
              disabled={isSaving}
              className="p-1.5 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-5 space-y-5">
            <FormSection title="Scheduling">
              <div className="space-y-4">
                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <div>
                    <p className="text-sm font-medium">Auto-trigger EOD</p>
                    <p className="text-xs text-muted-foreground">Automatically run EOD at the scheduled time</p>
                  </div>
                  <input type="checkbox" {...register('autoTrigger')} className="w-4 h-4 rounded accent-primary" />
                </label>

                <div className="space-y-1">
                  <label className="block text-sm font-medium">Scheduled Time (HH:MM)</label>
                  <input
                    type="time"
                    {...register('scheduledTime')}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                  />
                  {errors.scheduledTime && (
                    <p className="text-xs text-red-500">{errors.scheduledTime.message}</p>
                  )}
                </div>

                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <div>
                    <p className="text-sm font-medium">Block if unclosed branches</p>
                    <p className="text-xs text-muted-foreground">Prevent EOD if any branch has not signed off</p>
                  </div>
                  <input type="checkbox" {...register('blockIfUnclosedBranches')} className="w-4 h-4 rounded accent-primary" />
                </label>
              </div>
            </FormSection>

            <FormSection title="Notifications">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Notification Emails</label>
                <p className="text-xs text-muted-foreground">Receive EOD completion and failure alerts</p>
                <div className="flex flex-wrap gap-1.5 min-h-8 p-2 rounded-lg border bg-background">
                  {emails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => { setEmailInput(e.target.value); setEmailError(''); }}
                    onKeyDown={handleEmailKeyDown}
                    placeholder="email@example.com"
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background',
                      emailError && 'border-red-400',
                    )}
                  />
                  <button
                    type="button"
                    onClick={handleAddEmail}
                    className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border hover:bg-muted transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
                {emailError && <p className="text-xs text-red-500">{emailError}</p>}
              </div>
            </FormSection>

            <FormSection title="Error Handling">
              <div className="space-y-4">
                <label className="flex items-center justify-between gap-4 cursor-pointer">
                  <div>
                    <p className="text-sm font-medium">Auto-retry on failure</p>
                    <p className="text-xs text-muted-foreground">Automatically retry failed steps before alerting</p>
                  </div>
                  <input type="checkbox" {...register('autoRetry')} className="w-4 h-4 rounded accent-primary" />
                </label>

                {autoRetry && (
                  <div className="space-y-1">
                    <label className="block text-sm font-medium">Max retries (1–10)</label>
                    <input
                      type="number"
                      {...register('maxRetries', { valueAsNumber: true })}
                      min={1}
                      max={10}
                      className="w-24 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                    />
                    {errors.maxRetries && (
                      <p className="text-xs text-red-500">{errors.maxRetries.message}</p>
                    )}
                  </div>
                )}
              </div>
            </FormSection>
          </form>

          <div className="px-5 py-4 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
