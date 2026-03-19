import { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, Type, Pen } from 'lucide-react';

interface SignaturePadProps {
  onSignatureChange: (data: string, type: 'CANVAS' | 'TYPED') => void;
}

export function SignaturePad({ onSignatureChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');

  const getCtx = useCallback(() => canvasRef.current?.getContext('2d'), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const touch = 'touches' in e ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      onSignatureChange(canvasRef.current.toDataURL(), 'CANVAS');
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onSignatureChange('', 'CANVAS');
  };

  const handleTypedChange = (name: string) => {
    setTypedName(name);
    if (name.trim()) {
      onSignatureChange(`TYPED:${name}:${new Date().toISOString()}`, 'TYPED');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMode('draw')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-colors ${mode === 'draw' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
        >
          <Pen className="w-3 h-3" /> Draw
        </button>
        <button
          type="button"
          onClick={() => setMode('type')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-colors ${mode === 'type' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
        >
          <Type className="w-3 h-3" /> Type
        </button>
        {mode === 'draw' && (
          <button type="button" onClick={clearCanvas} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border hover:bg-muted ml-auto">
            <Eraser className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {mode === 'draw' ? (
        <div className="border rounded-lg bg-white dark:bg-gray-950 p-1">
          <canvas
            ref={canvasRef}
            width={500}
            height={150}
            className="w-full cursor-crosshair touch-none"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          <p className="text-center text-xs text-muted-foreground mt-1">Sign above using mouse or touch</p>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={typedName}
            onChange={(e) => handleTypedChange(e.target.value)}
            placeholder="Type your full name as signature"
            className="w-full px-3 py-2 border rounded-md text-lg italic font-serif"
          />
          {typedName && (
            <p className="text-xs text-muted-foreground">
              Signed electronically as &quot;{typedName}&quot; on {new Date().toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
