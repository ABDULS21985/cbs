import { useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Upload, FileText, Plus, Trash2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FormSection } from '@/components/shared';
import { achApi } from '../../api/achApi';

interface AchBatchUploaderProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type UploadMode = 'file' | 'template';

const templateSchema = z.object({
  originatorName: z.string().min(1, 'Originator name is required'),
  effectiveDate: z.string().min(1, 'Effective date is required'),
  type: z.enum(['CREDIT', 'DEBIT']),
});

type TemplateForm = z.infer<typeof templateSchema>;

interface ManualItem {
  id: string;
  name: string;
  accountNumber: string;
  routingNumber: string;
  amount: string;
  transactionCode: string;
}

interface ValidationResult {
  lineCount: number;
  itemCount: number;
  total: number;
  errors: string[];
  valid: boolean;
}

function validateNachaContent(content: string): ValidationResult {
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  const errors: string[] = [];
  let itemCount = 0;
  let total = 0;

  const fileHeader = lines.find((l) => l.startsWith('1'));
  if (!fileHeader) errors.push('Missing File Header record (type 1)');

  const fileControl = lines.find((l) => l.startsWith('9') && l !== '9'.repeat(94));
  if (!fileControl) errors.push('Missing File Control record (type 9)');

  lines.forEach((line, idx) => {
    if (line.startsWith('6')) {
      itemCount++;
      const amountStr = line.slice(29, 39);
      const amount = parseInt(amountStr, 10);
      if (!isNaN(amount)) total += amount / 100;
    }
    if (line.length !== 94 && line !== '9'.repeat(94)) {
      errors.push(`Line ${idx + 1}: expected 94 characters, got ${line.length}`);
    }
  });

  if (itemCount === 0) errors.push('No entry detail records (type 6) found');

  return { lineCount: lines.length, itemCount, total, errors, valid: errors.length === 0 };
}

export function AchBatchUploader({ open, onClose, onSuccess }: AchBatchUploaderProps) {
  const [mode, setMode] = useState<UploadMode>('file');
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [manualItems, setManualItems] = useState<ManualItem[]>([
    { id: '1', name: '', accountNumber: '', routingNumber: '', amount: '', transactionCode: '22' },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: { originatorName: '', effectiveDate: '', type: 'CREDIT' },
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.ach') || file.name.endsWith('.txt'))) {
      setSelectedFile(file);
      setValidation(null);
    } else {
      toast.error('Please upload a .ach or .txt NACHA file');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValidation(null);
    }
  };

  const handleValidate = async () => {
    if (!selectedFile) return;
    setValidating(true);
    try {
      const content = await selectedFile.text();
      const result = validateNachaContent(content);
      setValidation(result);
    } catch {
      toast.error('Failed to read file');
    } finally {
      setValidating(false);
    }
  };

  const handleSubmitFile = async () => {
    if (!selectedFile) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      await achApi.submitBatch(formData);
      toast.success('ACH batch submitted successfully');
      onSuccess();
      handleClose();
    } catch {
      toast.error('Failed to submit batch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitTemplate = async (values: TemplateForm) => {
    if (manualItems.some((i) => !i.name || !i.accountNumber || !i.routingNumber || !i.amount)) {
      toast.error('Please fill in all item fields');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('originatorName', values.originatorName);
      formData.append('effectiveDate', values.effectiveDate);
      formData.append('type', values.type);
      formData.append('items', JSON.stringify(manualItems));
      await achApi.submitBatch(formData);
      toast.success('ACH batch submitted successfully');
      onSuccess();
      handleClose();
    } catch {
      toast.error('Failed to submit batch');
    } finally {
      setSubmitting(false);
    }
  };

  const addItem = () => {
    setManualItems((prev) => [
      ...prev,
      { id: String(Date.now()), name: '', accountNumber: '', routingNumber: '', amount: '', transactionCode: '22' },
    ]);
  };

  const removeItem = (id: string) => {
    setManualItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof ManualItem, value: string) => {
    setManualItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const handleClose = () => {
    setSelectedFile(null);
    setValidation(null);
    setMode('file');
    form.reset();
    setManualItems([{ id: '1', name: '', accountNumber: '', routingNumber: '', amount: '', transactionCode: '22' }]);
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <Dialog.Title className="text-lg font-semibold">New ACH Batch</Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Mode Toggle */}
          <div className="px-6 pt-4 flex-shrink-0">
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
              <button
                onClick={() => setMode('file')}
                className={cn(
                  'px-4 py-1.5 text-sm rounded-md font-medium transition-all',
                  mode === 'file'
                    ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
                )}
              >
                Upload NACHA File
              </button>
              <button
                onClick={() => setMode('template')}
                className={cn(
                  'px-4 py-1.5 text-sm rounded-md font-medium transition-all',
                  mode === 'template'
                    ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
                )}
              >
                Use Template
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {mode === 'file' && (
              <div className="space-y-4">
                {/* Drop zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all',
                    dragOver
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : selectedFile
                      ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".ach,.txt"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-10 h-10 text-green-500" />
                      <p className="font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-10 h-10 text-gray-400" />
                      <p className="font-medium text-gray-700 dark:text-gray-300">
                        Drag & drop or click to browse
                      </p>
                      <p className="text-sm text-gray-500">Accepts .ach and .txt NACHA files</p>
                    </div>
                  )}
                </div>

                {/* Validation Results */}
                {validation && (
                  <div className={cn(
                    'rounded-lg border p-4',
                    validation.valid
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                      : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
                  )}>
                    <div className="flex items-center gap-2 mb-3">
                      {validation.valid ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className="font-medium text-sm">
                        {validation.valid ? 'File is valid' : 'Validation errors found'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Lines:</span>
                        <span className="ml-2 font-medium">{validation.lineCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Items:</span>
                        <span className="ml-2 font-medium">{validation.itemCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Total:</span>
                        <span className="ml-2 font-medium">${validation.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    {validation.errors.length > 0 && (
                      <ul className="space-y-1">
                        {validation.errors.map((err, i) => (
                          <li key={i} className="text-xs text-red-700 dark:text-red-400 flex items-start gap-1.5">
                            <span className="mt-0.5 flex-shrink-0">•</span>
                            {err}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={handleValidate}
                    disabled={!selectedFile || validating}
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    {validating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Validate
                  </button>
                  <button
                    onClick={handleSubmitFile}
                    disabled={!selectedFile || submitting || (validation !== null && !validation.valid)}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit Batch
                  </button>
                </div>
              </div>
            )}

            {mode === 'template' && (
              <form onSubmit={form.handleSubmit(handleSubmitTemplate)} className="space-y-6">
                <FormSection title="Batch Details">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Originator Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        {...form.register('originatorName')}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Company or bank name"
                      />
                      {form.formState.errors.originatorName && (
                        <p className="mt-1 text-xs text-red-500">{form.formState.errors.originatorName.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Effective Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        {...form.register('effectiveDate')}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {form.formState.errors.effectiveDate && (
                        <p className="mt-1 text-xs text-red-500">{form.formState.errors.effectiveDate.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Batch Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        {...form.register('type')}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="CREDIT">Credit</option>
                        <option value="DEBIT">Debit</option>
                      </select>
                    </div>
                  </div>
                </FormSection>

                <FormSection title={`Entry Items (${manualItems.length})`}>
                  <div className="space-y-3">
                    {manualItems.map((item, idx) => (
                      <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">Item {idx + 1}</span>
                          {manualItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <input
                            value={item.name}
                            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                            placeholder="Receiver name"
                            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            value={item.accountNumber}
                            onChange={(e) => updateItem(item.id, 'accountNumber', e.target.value)}
                            placeholder="Account number"
                            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs bg-white dark:bg-gray-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            value={item.routingNumber}
                            onChange={(e) => updateItem(item.id, 'routingNumber', e.target.value)}
                            placeholder="Routing number"
                            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs bg-white dark:bg-gray-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            value={item.amount}
                            onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
                            placeholder="Amount (USD)"
                            type="number"
                            min="0"
                            step="0.01"
                            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <select
                            value={item.transactionCode}
                            onChange={(e) => updateItem(item.id, 'transactionCode', e.target.value)}
                            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="22">22 - Checking Credit</option>
                            <option value="27">27 - Checking Debit</option>
                            <option value="32">32 - Savings Credit</option>
                            <option value="37">37 - Savings Debit</option>
                            <option value="42">42 - GL Credit</option>
                            <option value="52">52 - Loan Credit</option>
                          </select>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addItem}
                      className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item
                    </button>
                  </div>
                </FormSection>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit Batch
                  </button>
                </div>
              </form>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
