import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle2, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/formatters';

interface ParsedPreview {
  entriesCount: number;
  dateRange: { from: string; to: string };
  totalAmount: number;
  isDuplicate?: boolean;
}

interface StatementUploaderProps {
  onUpload: (file: File) => Promise<void>;
  accountId: string;
}

const ACCEPTED_EXTENSIONS = ['.csv', '.txt', '.xml'];
const ACCEPTED_MIME = ['text/csv', 'text/plain', 'application/xml', 'text/xml', 'application/octet-stream'];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StatementUploader({ onUpload, accountId }: StatementUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedPreview | null>(null);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isValidFile = (f: File): boolean => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    return ACCEPTED_EXTENSIONS.includes(ext) || ACCEPTED_MIME.includes(f.type);
  };

  // Simulate parsing the file for preview
  const parseFile = async (f: File): Promise<ParsedPreview> => {
    await new Promise((r) => setTimeout(r, 800));
    // Mock parse result — in production this would parse CSV/MT940/XML
    const sizeFactor = Math.max(1, Math.floor(f.size / 512));
    return {
      entriesCount: Math.min(50, 10 + sizeFactor),
      dateRange: { from: '2026-03-01', to: '2026-03-19' },
      totalAmount: 28_459_000 + (sizeFactor * 1000),
      isDuplicate: false,
    };
  };

  const handleFile = async (f: File) => {
    setError(null);
    setSuccess(false);
    setPreview(null);

    if (!isValidFile(f)) {
      setError(`Invalid file type. Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`);
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10 MB.');
      return;
    }

    setFile(f);
    setParsing(true);
    try {
      const result = await parseFile(f);
      setPreview(result);
    } catch {
      setError('Failed to parse file. Please check the format and try again.');
      setFile(null);
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const handleImport = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
      setSuccess(true);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    setSuccess(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      {!file && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'relative rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors cursor-pointer',
            dragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/30',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(',')}
            onChange={handleInputChange}
            className="sr-only"
            aria-label="Upload bank statement"
          />
          <Upload className={cn('w-10 h-10 mx-auto mb-3', dragging ? 'text-primary' : 'text-muted-foreground/40')} />
          <p className="text-sm font-medium">
            {dragging ? 'Drop the file here' : 'Drag & drop or click to upload'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports: CSV, MT940 (.txt), XML &nbsp;·&nbsp; Max 10 MB
          </p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            Account: {accountId}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 px-3.5 py-3 text-xs text-red-700 dark:text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
          <button onClick={handleClear} className="ml-auto flex-shrink-0 hover:opacity-70">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Parsing Spinner */}
      {parsing && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-muted-foreground">Parsing file…</span>
        </div>
      )}

      {/* File Preview */}
      {file && preview && !parsing && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium truncate max-w-[260px]">{file.name}</span>
              <span className="text-xs text-muted-foreground">({formatFileSize(file.size)})</span>
            </div>
            <button onClick={handleClear} className="p-1 rounded-md hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="rounded-lg bg-muted/40 px-3 py-2.5">
              <p className="text-muted-foreground">Entries Found</p>
              <p className="text-2xl font-bold mt-0.5">{preview.entriesCount}</p>
            </div>
            <div className="rounded-lg bg-muted/40 px-3 py-2.5">
              <p className="text-muted-foreground">Date From</p>
              <p className="font-semibold mt-0.5">{preview.dateRange.from}</p>
            </div>
            <div className="rounded-lg bg-muted/40 px-3 py-2.5">
              <p className="text-muted-foreground">Date To</p>
              <p className="font-semibold mt-0.5">{preview.dateRange.to}</p>
            </div>
            <div className="rounded-lg bg-muted/40 px-3 py-2.5">
              <p className="text-muted-foreground">Total Amount</p>
              <p className="font-mono font-semibold mt-0.5">{formatMoney(preview.totalAmount)}</p>
            </div>
          </div>

          {/* Duplicate Warning */}
          {preview.isDuplicate && (
            <div className="mx-4 mb-4 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 px-3.5 py-3 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Potential duplicate detected.</strong> A statement for this account and date range may already exist. Review carefully before importing.
              </p>
            </div>
          )}

          <div className="px-4 pb-4">
            <button
              onClick={handleImport}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</>
              ) : (
                <><Upload className="w-4 h-4" /> Import Statement</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 px-3.5 py-3 text-xs text-green-700 dark:text-green-400">
          <CheckCircle2 className="w-4 h-4" />
          <p>Statement imported successfully. Run Auto-Match to reconcile entries.</p>
        </div>
      )}
    </div>
  );
}
