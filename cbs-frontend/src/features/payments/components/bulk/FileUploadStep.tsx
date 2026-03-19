import { useState, useCallback } from 'react';
import { Upload, FileText, Download } from 'lucide-react';
import { bulkPaymentApi } from '../../api/bulkPaymentApi';

interface Props {
  onUploadComplete: (batchId: number) => void;
  templateUrl?: string;
  label?: string;
}

export function FileUploadStep({ onUploadComplete, templateUrl, label = 'bulk payment' }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setUploading(true);
    try {
      const batch = await bulkPaymentApi.upload(file);
      onUploadComplete(batch.id);
    } catch {
      setUploading(false);
    }
  }, [onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${isDragging ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/50'}`}
      >
        <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium">Drag & drop your CSV or Excel file here</p>
        <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
        <label className="inline-flex items-center gap-2 px-4 py-2 mt-3 bg-primary text-primary-foreground rounded-md text-sm font-medium cursor-pointer hover:bg-primary/90">
          <FileText className="w-4 h-4" />
          {uploading ? 'Uploading...' : 'Choose File'}
          <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" disabled={uploading} />
        </label>
        {fileName && <p className="text-xs text-muted-foreground mt-2">Selected: {fileName}</p>}
      </div>

      {templateUrl !== undefined && (
        <a href={bulkPaymentApi.downloadTemplate()} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
          <Download className="w-3 h-3" /> Download {label} template (CSV)
        </a>
      )}
    </div>
  );
}
