import { cn } from '@/lib/utils';
import {
  Send,
  ShieldCheck,
  Fingerprint,
  FileCheck,
  KeyRound,
  ChevronRight,
  ShieldOff,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ScaStatus } from '../../api/psd2Api';

interface ScaFlowDiagramProps {
  /** Current step number (1-5), or 0 for idle. Also accepts a ScaStatus string. */
  currentStep?: number;
  /** SCA status from backend — when provided, overrides currentStep with precise state. */
  scaStatus?: ScaStatus;
}

interface FlowStep {
  step: number;
  label: string;
  description: string;
  icon: LucideIcon;
}

const STEPS: FlowStep[] = [
  {
    step: 1,
    label: 'TPP Requests',
    description: 'TPP initiates access request via API',
    icon: Send,
  },
  {
    step: 2,
    label: 'Bank Initiates SCA',
    description: 'ASPSP creates SCA session and selects auth method',
    icon: ShieldCheck,
  },
  {
    step: 3,
    label: 'Customer Authenticates',
    description: 'Customer completes strong authentication challenge',
    icon: Fingerprint,
  },
  {
    step: 4,
    label: 'Consent Granted',
    description: 'Customer authorises specific scopes and data access',
    icon: FileCheck,
  },
  {
    step: 5,
    label: 'Token Issued',
    description: 'Access token issued to TPP with granted scopes',
    icon: KeyRound,
  },
];

type StepState = 'idle' | 'completed' | 'active' | 'pending' | 'failed' | 'exempted';

/**
 * Map backend ScaStatus to the step number + state for each flow step.
 *
 * Backend statuses:
 *   STARTED                → Step 1 active (session created, awaiting SCA)
 *   AUTHENTICATION_REQUIRED → Step 2 active (bank selected method, waiting for customer)
 *   METHOD_SELECTED         → Step 3 active (customer is authenticating)
 *   FINALISED               → Step 5 completed (all steps done)
 *   FAILED                  → Step 3 failed (authentication failed)
 *   EXEMPTED                → Step 2 completed, then skips to step 5 (no customer auth needed)
 */
function resolveCurrentStep(currentStep: number, scaStatus?: ScaStatus): number {
  if (scaStatus) {
    switch (scaStatus) {
      case 'STARTED': return 1;
      case 'AUTHENTICATION_REQUIRED': return 2;
      case 'METHOD_SELECTED': return 3;
      case 'FINALISED': return 6; // All steps completed
      case 'FAILED': return 3; // Failed at authentication
      case 'EXEMPTED': return 6; // All steps completed (via exemption)
      default: return currentStep;
    }
  }
  return currentStep;
}

function getStepState(stepNumber: number, resolvedStep: number, scaStatus?: ScaStatus): StepState {
  if (resolvedStep === 0) return 'idle';

  // Handle EXEMPTED — steps 1-2 completed, 3 skipped (exempted), 4-5 completed
  if (scaStatus === 'EXEMPTED') {
    if (stepNumber <= 2) return 'completed';
    if (stepNumber === 3) return 'exempted'; // Customer auth was not required
    return 'completed'; // Consent + token granted automatically
  }

  // Handle FAILED — steps before 3 completed, step 3 failed, rest pending
  if (scaStatus === 'FAILED') {
    if (stepNumber < 3) return 'completed';
    if (stepNumber === 3) return 'failed';
    return 'pending';
  }

  // Normal linear flow
  if (stepNumber < resolvedStep) return 'completed';
  if (stepNumber === resolvedStep) return 'active';
  return 'pending';
}

function getStepColors(state: StepState) {
  switch (state) {
    case 'completed':
      return {
        bg: 'bg-green-100 dark:bg-green-900/30',
        icon: 'text-green-600',
        label: 'text-green-600',
      };
    case 'active':
      return {
        bg: 'bg-primary/10 ring-2 ring-primary',
        icon: 'text-primary',
        label: 'text-primary',
      };
    case 'failed':
      return {
        bg: 'bg-red-100 dark:bg-red-900/30 ring-2 ring-red-400',
        icon: 'text-red-600',
        label: 'text-red-600',
      };
    case 'exempted':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-400',
        icon: 'text-blue-600',
        label: 'text-blue-600',
      };
    case 'pending':
      return {
        bg: 'bg-muted',
        icon: 'text-muted-foreground/50',
        label: 'text-muted-foreground/50',
      };
    default:
      return {
        bg: 'bg-muted',
        icon: 'text-muted-foreground',
        label: '',
      };
  }
}

export function ScaFlowDiagram({ currentStep = 0, scaStatus }: ScaFlowDiagramProps) {
  const resolvedStep = resolveCurrentStep(currentStep, scaStatus);

  // Build status summary banner
  const statusBanner = scaStatus === 'EXEMPTED'
    ? { icon: ShieldOff, text: 'SCA Exempted — Low-value or trusted transaction, customer authentication skipped', color: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400' }
    : scaStatus === 'FAILED'
      ? { icon: XCircle, text: 'SCA Failed — Customer authentication was unsuccessful', color: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400' }
      : null;

  return (
    <div className="rounded-xl border bg-card p-6">
      <h3 className="text-sm font-semibold mb-1">SCA Authentication Flow</h3>
      <p className="text-xs text-muted-foreground mb-6">
        PSD2 Strong Customer Authentication (SCA) process for TPP access authorization
      </p>

      {/* Status banner for special states */}
      {statusBanner && (
        <div className={cn('flex items-center gap-2 px-4 py-3 rounded-lg border mb-6 text-sm', statusBanner.color)}>
          <statusBanner.icon className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs font-medium">{statusBanner.text}</span>
        </div>
      )}

      {/* Desktop flow - horizontal */}
      <div className="hidden md:flex items-start justify-between gap-2">
        {STEPS.map((step, idx) => {
          const state = getStepState(step.step, resolvedStep, scaStatus);
          const colors = getStepColors(state);
          const Icon = state === 'failed' ? XCircle
            : state === 'exempted' ? ShieldOff
            : step.icon;
          return (
            <div key={step.step} className="flex items-start flex-1">
              <div className="flex flex-col items-center text-center flex-1">
                <div className={cn('w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors', colors.bg)}>
                  <Icon className={cn('w-5 h-5', colors.icon)} />
                </div>
                <div className={cn('text-xs font-semibold mb-1', colors.label)}>
                  Step {step.step}
                </div>
                <div className={cn('text-xs font-medium', state === 'pending' && 'text-muted-foreground/50')}>
                  {state === 'exempted' ? 'Exempted' : state === 'failed' ? 'Failed' : step.label}
                </div>
                <p className={cn('text-[11px] text-muted-foreground mt-1 max-w-[140px]', state === 'pending' && 'opacity-50')}>
                  {state === 'exempted'
                    ? 'SCA not required for this transaction'
                    : state === 'failed'
                      ? 'Authentication challenge unsuccessful'
                      : step.description}
                </p>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="flex items-center pt-5 px-1">
                  <ChevronRight
                    className={cn(
                      'w-5 h-5',
                      (() => {
                        const nextState = getStepState(step.step + 1, resolvedStep, scaStatus);
                        return nextState === 'completed' || nextState === 'active' || nextState === 'exempted'
                          ? 'text-primary'
                          : nextState === 'failed'
                            ? 'text-red-400'
                            : 'text-muted-foreground/30';
                      })(),
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile flow - vertical */}
      <div className="md:hidden space-y-4">
        {STEPS.map((step, idx) => {
          const state = getStepState(step.step, resolvedStep, scaStatus);
          const colors = getStepColors(state);
          const Icon = state === 'failed' ? XCircle
            : state === 'exempted' ? ShieldOff
            : step.icon;
          return (
            <div key={step.step}>
              <div className="flex items-start gap-3">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', colors.bg)}>
                  <Icon className={cn('w-4 h-4', colors.icon)} />
                </div>
                <div>
                  <div className="text-xs font-semibold">
                    Step {step.step}: {state === 'exempted' ? 'Exempted' : state === 'failed' ? 'Failed' : step.label}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {state === 'exempted'
                      ? 'SCA not required for this transaction'
                      : state === 'failed'
                        ? 'Authentication challenge unsuccessful'
                        : step.description}
                  </p>
                </div>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="ml-5 border-l-2 border-dashed h-4 my-1 border-muted-foreground/20" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
