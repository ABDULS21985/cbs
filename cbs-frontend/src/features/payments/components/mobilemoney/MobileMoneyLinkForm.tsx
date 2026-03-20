import { useState, useEffect, useRef } from 'react';
import { X, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { qrApi, type LinkMobileRequest } from '../../api/qrApi';

interface MobileMoneyLinkFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Provider = LinkMobileRequest['provider'];

interface ProviderConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  prefixes: string[];
  logo: string;
}

const PROVIDERS: Record<Provider, ProviderConfig> = {
  MTN_MOMO: {
    label: 'MTN MoMo',
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-400',
    prefixes: ['0803', '0806', '0813', '0814', '0816', '0906', '0703', '0706'],
    logo: 'M',
  },
  AIRTEL_MONEY: {
    label: 'Airtel Money',
    color: 'text-red-800',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-400',
    prefixes: ['0802', '0808', '0812', '0701', '0708', '0902', '0907', '0901'],
    logo: 'A',
  },
  '9PSB': {
    label: '9PSB',
    color: 'text-green-800',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-400',
    prefixes: ['0905', '07025', '07026'],
    logo: '9',
  },
  OPAY: {
    label: 'OPay',
    color: 'text-emerald-800',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-400',
    prefixes: ['0700'],
    logo: 'O',
  },
  PALMPAY: {
    label: 'PalmPay',
    color: 'text-blue-800',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-400',
    prefixes: ['0707'],
    logo: 'P',
  },
};

export function MobileMoneyLinkForm({ open, onClose, onSuccess }: MobileMoneyLinkFormProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [provider, setProvider] = useState<Provider | ''>('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [linkId, setLinkId] = useState('');
  const [otp, setOtp] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setProvider('');
      setMobileNumber('');
      setAccountNumber('');
      setLinkId('');
      setOtp('');
      setOtpCooldown(0);
      setErrors({});
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setOtpCooldown(60);
    cooldownRef.current = setInterval(() => {
      setOtpCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!provider) errs.provider = 'Please select a provider';
    if (!mobileNumber.trim()) {
      errs.mobileNumber = 'Mobile number is required';
    } else if (!/^\d{11}$/.test(mobileNumber.trim())) {
      errs.mobileNumber = 'Must be an 11-digit mobile number';
    } else if (provider) {
      const config = PROVIDERS[provider as Provider];
      const hasValidPrefix = config.prefixes.some((p) => mobileNumber.startsWith(p));
      if (!hasValidPrefix) {
        errs.mobileNumber = `Invalid prefix for ${config.label}`;
      }
    }
    if (!accountNumber.trim()) {
      errs.accountNumber = 'Account number is required';
    } else if (!/^\d{10}$/.test(accountNumber.trim())) {
      errs.accountNumber = 'Must be a 10-digit account number';
    }
    return errs;
  };

  const handleVerify = async () => {
    const errs = validateStep1();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      const result = await qrApi.linkMobileAccount({
        provider: provider as Provider,
        mobileNumber: mobileNumber.trim(),
        accountId: accountNumber.trim(),
        accountNumber: accountNumber.trim(),
      });
      setLinkId(result.id);
      setStep(2);
      startCooldown();
      toast.success('OTP sent to your mobile number');
    } catch {
      toast.error('Failed to initiate linking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpCooldown > 0) return;
    setIsSubmitting(true);
    try {
      await qrApi.linkMobileAccount({
        provider: provider as Provider,
        mobileNumber: mobileNumber.trim(),
        accountId: accountNumber.trim(),
        accountNumber: accountNumber.trim(),
      });
      startCooldown();
      toast.success('OTP resent to your mobile number');
    } catch {
      toast.error('Failed to resend OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (otp.length !== 6) {
      setErrors({ otp: 'Enter the 6-digit OTP' });
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      const result = await qrApi.verifyOtp(linkId, otp);
      if (!result.verified) {
        setErrors({ otp: result.message || 'Invalid OTP' });
        return;
      }
      toast.success('Mobile money account linked successfully');
      onSuccess();
      onClose();
    } catch {
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-xl shadow-2xl border w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h3 className="text-base font-semibold">Link Mobile Money Account</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Step {step} of 2</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            {step === 1 ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Select Provider
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {(Object.entries(PROVIDERS) as [Provider, ProviderConfig][]).map(([key, cfg]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setProvider(key);
                          setErrors((p) => ({ ...p, provider: '' }));
                        }}
                        className={cn(
                          'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-left',
                          provider === key
                            ? `${cfg.bgColor} ${cfg.borderColor} ${cfg.color}`
                            : 'border-border hover:border-muted-foreground/40',
                        )}
                      >
                        <span
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                            provider === key ? cfg.bgColor : 'bg-muted',
                          )}
                        >
                          {cfg.logo}
                        </span>
                        <span className="text-xs font-medium text-center leading-tight">{cfg.label}</span>
                      </button>
                    ))}
                  </div>
                  {errors.provider && <p className="text-xs text-red-500 mt-1">{errors.provider}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    value={mobileNumber}
                    onChange={(e) => {
                      setMobileNumber(e.target.value.replace(/\D/g, ''));
                      setErrors((p) => ({ ...p, mobileNumber: '' }));
                    }}
                    placeholder="08012345678"
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  />
                  {errors.mobileNumber && (
                    <p className="text-xs text-red-500 mt-1">{errors.mobileNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Account Number
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={accountNumber}
                    onChange={(e) => {
                      setAccountNumber(e.target.value.replace(/\D/g, ''));
                      setErrors((p) => ({ ...p, accountNumber: '' }));
                    }}
                    placeholder="0000000000"
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  />
                  {errors.accountNumber && (
                    <p className="text-xs text-red-500 mt-1">{errors.accountNumber}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? 'Sending OTP...' : 'Verify & Send OTP'}
                </button>
              </>
            ) : (
              <>
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p className="text-muted-foreground">
                    OTP sent to{' '}
                    <span className="font-mono font-medium text-foreground">{mobileNumber}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Enter 6-Digit OTP
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, ''));
                      setErrors((p) => ({ ...p, otp: '' }));
                    }}
                    placeholder="000000"
                    aria-label="Enter 6-digit OTP verification code"
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono text-center tracking-[0.5em] text-lg"
                  />
                  {errors.otp && <p className="text-xs text-red-500 mt-1">{errors.otp}</p>}
                </div>

                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={otpCooldown > 0 || isSubmitting}
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {otpCooldown > 0 ? `Resend OTP in ${otpCooldown}s` : 'Resend OTP'}
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isSubmitting || otp.length !== 6}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSubmitting ? 'Verifying...' : 'Link Account'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
