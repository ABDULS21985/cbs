import { Monitor, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';

interface KnownDevice {
  device: string;
  lastSeen: string;
  trusted: boolean;
}

interface Props {
  knownDevices: KnownDevice[];
  currentDevice?: string;
}

export function DeviceFingerprintCard({ knownDevices, currentDevice }: Props) {
  const isNewDevice = currentDevice && !knownDevices.some((d) => d.device === currentDevice);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Monitor className="w-4 h-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold">Device Fingerprint</h4>
      </div>

      {/* Current device warning */}
      {isNewDevice && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800 p-3">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-semibold text-red-700 dark:text-red-400">Unknown Device</div>
            <div className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              Current device not in known device list: <span className="font-mono">{currentDevice}</span>
            </div>
          </div>
        </div>
      )}

      {/* Known devices list */}
      <div className="space-y-2">
        {knownDevices.length === 0 ? (
          <div className="text-xs text-muted-foreground italic">No known devices on record</div>
        ) : (
          knownDevices.map((device, idx) => {
            const isCurrent = device.device === currentDevice;
            return (
              <div
                key={idx}
                className={cn(
                  'flex items-center justify-between rounded-md px-3 py-2 text-xs',
                  isCurrent ? 'bg-primary/5 border border-primary/20' : 'bg-muted/30'
                )}
              >
                <div className="flex items-center gap-2">
                  {device.trusted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span className={cn('font-mono', isCurrent && 'font-semibold')}>{device.device}</span>
                  {isCurrent && (
                    <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                      Current
                    </span>
                  )}
                </div>
                <div className="text-muted-foreground">
                  Last seen {formatDate(device.lastSeen)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
