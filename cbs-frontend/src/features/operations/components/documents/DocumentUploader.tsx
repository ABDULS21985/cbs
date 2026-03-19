import { useState, useRef, useCallback } from 'react';
import { Upload, X, File, FolderOpen, Tag, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DocumentFolder } from '../../api/documentApi';

interface DocumentUploaderProps {
  currentFolder?: DocumentFolder;
  onUpload: (files: File[], folder: DocumentFolder, tags: string[]) => Promise<void>;
}

interface UploadFileItem {
  file: File;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'done' | 'error';
}

const FOLDER_OPTIONS: { value: DocumentFolder; label: string }[] = [
  { value: 'customer/kyc', label: 'Customer / KYC' },
  { value: 'customer/agreements', label: 'Customer / Agreements' },
  { value: 'customer/correspondence', label: 'Customer / Correspondence' },
  { value: 'loan/applications', label: 'Loan / Applications' },
  { value: 'loan/collateral', label: 'Loan / Collateral' },
  { value: 'loan/legal', label: 'Loan / Legal' },
  { value: 'regulatory/cbn', label: 'Regulatory / CBN Returns' },
  { value: 'regulatory/ndic', label: 'Regulatory / NDIC Returns' },
  { value: 'internal/policies', label: 'Internal / Policies' },
  { value: 'internal/procedures', label: 'Internal / Procedures' },
  { value: 'internal/training', label: 'Internal / Training' },
  { value: 'templates', label: 'Templates' },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUploader({ currentFolder, onUpload }: DocumentUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [fileItems, setFileItems] = useState<UploadFileItem[]>([]);
  const [folder, setFolder] = useState<DocumentFolder>(currentFolder ?? 'customer/kyc');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(newFiles: File[]) {
    const items: UploadFileItem[] = newFiles.map((f) => ({
      file: f,
      progress: 0,
      status: 'pending',
    }));
    setFileItems((prev) => [...prev, ...items]);
  }

  function removeFile(index: number) {
    setFileItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) addFiles(dropped);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length) addFiles(picked);
    e.target.value = '';
  }

  function addTag() {
    const raw = tagInput.trim().toLowerCase();
    if (!raw) return;
    const newTags = raw
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t && !tags.includes(t));
    if (newTags.length) setTags((prev) => [...prev, ...newTags]);
    setTagInput('');
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
    if (e.key === 'Backspace' && !tagInput && tags.length) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  const simulateProgress = useCallback((index: number) => {
    return new Promise<void>((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 25 + 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setFileItems((prev) =>
            prev.map((item, i) =>
              i === index ? { ...item, progress: 100, status: 'done' } : item,
            ),
          );
          resolve();
        } else {
          setFileItems((prev) =>
            prev.map((item, i) =>
              i === index ? { ...item, progress: Math.round(progress), status: 'uploading' } : item,
            ),
          );
        }
      }, 180);
    });
  }, []);

  async function handleUpload() {
    if (!fileItems.length) return;
    setUploading(true);

    try {
      const progressPromises = fileItems.map((_, i) => simulateProgress(i));
      await Promise.all(progressPromises);
      await onUpload(
        fileItems.map((fi) => fi.file),
        folder,
        tags,
      );
      setFileItems([]);
      setTags([]);
    } catch {
      setFileItems((prev) =>
        prev.map((item) =>
          item.status === 'uploading' ? { ...item, status: 'error' } : item,
        ),
      );
    } finally {
      setUploading(false);
    }
  }

  const allDone = fileItems.length > 0 && fileItems.every((f) => f.status === 'done');

  return (
    <div className="space-y-5">
      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer',
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/30',
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="p-3 rounded-full bg-muted">
          <Upload className="w-6 h-6 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            Drag files here or{' '}
            <span className="text-primary underline underline-offset-2">browse</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, DOCX, XLSX, Images, TXT, CSV — max 50 MB each
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png,.txt,.csv"
          onChange={handleFileInput}
        />
      </div>

      {/* Folder Selection */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          <FolderOpen className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
          Destination Folder
        </label>
        <div className="relative">
          <select
            value={folder}
            onChange={(e) => setFolder(e.target.value as DocumentFolder)}
            className="w-full appearance-none px-3 py-2 text-sm border border-border rounded-lg bg-background pr-8 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {FOLDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Tag Input */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          <Tag className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
          Tags{' '}
          <span className="font-normal">(press Enter or comma to add)</span>
        </label>
        <div className="flex flex-wrap items-center gap-1.5 p-2 border border-border rounded-lg bg-background min-h-[40px] focus-within:ring-2 focus-within:ring-primary/30">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-primary/60 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={addTag}
            placeholder={tags.length === 0 ? 'kyc, identity, verified...' : ''}
            className="flex-1 min-w-[120px] text-sm bg-transparent outline-none placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {/* File List */}
      {fileItems.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Files to Upload ({fileItems.length})
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {fileItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/20"
              >
                <File className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium truncate">{item.file.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                      {formatBytes(item.file.size)}
                    </span>
                  </div>
                  {item.status !== 'pending' && (
                    <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-200',
                          item.status === 'done' ? 'bg-green-500' : item.status === 'error' ? 'bg-red-500' : 'bg-primary',
                        )}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  {item.status === 'error' && (
                    <p className="text-[10px] text-red-500 mt-0.5">Upload failed. Try again.</p>
                  )}
                </div>
                {item.status === 'pending' && (
                  <button
                    onClick={() => removeFile(i)}
                    className="p-1 rounded hover:bg-muted transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
                {item.status === 'done' && (
                  <span className="text-[10px] text-green-600 font-medium shrink-0">Done</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">
          {fileItems.length === 0
            ? 'No files selected'
            : `${fileItems.filter((f) => f.status === 'pending').length} pending`}
        </span>
        <button
          onClick={handleUpload}
          disabled={fileItems.length === 0 || uploading || allDone}
          className={cn(
            'flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg transition-colors',
            fileItems.length === 0 || uploading || allDone
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading…' : allDone ? 'Upload Complete' : 'Upload'}
        </button>
      </div>
    </div>
  );
}
