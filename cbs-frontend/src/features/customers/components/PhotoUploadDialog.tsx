import { useState, useRef } from 'react';
import { X, Upload, Camera } from 'lucide-react';
import { useUploadPhoto } from '../hooks/useCustomerIntelligence';
import { toast } from 'sonner';

interface PhotoUploadDialogProps {
  customerId: number;
  onClose: () => void;
}

export function PhotoUploadDialog({ customerId, onClose }: PhotoUploadDialogProps) {
  const upload = useUploadPhoto();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setFile(selected);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(selected);
  };

  const handleUpload = () => {
    if (!file) return;
    upload.mutate(
      { id: customerId, file },
      {
        onSuccess: () => {
          toast.success('Photo uploaded');
          onClose();
        },
        onError: () => toast.error('Failed to upload photo'),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-semibold mb-4">Upload Profile Photo</h2>

        <div className="space-y-4">
          {/* Preview */}
          <div className="flex justify-center">
            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
                />
                <button
                  onClick={() => { setPreview(null); setFile(null); }}
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-32 h-32 rounded-full border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
              >
                <Camera className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Click to select</span>
              </button>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!preview && (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted text-sm"
            >
              <Upload className="w-4 h-4" /> Choose Image
            </button>
          )}

          <p className="text-xs text-muted-foreground text-center">
            Accepted: JPEG, PNG, WebP. Max 5MB. Will be cropped to a circle.
          </p>

          {preview && (
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="btn-secondary">Cancel</button>
              <button
                onClick={handleUpload}
                disabled={upload.isPending}
                className="btn-primary"
              >
                {upload.isPending ? 'Uploading...' : 'Upload Photo'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
