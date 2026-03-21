import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export interface ValidationRule {
  ruleNumber: number;
  description: string;
  expectedValue?: string;
  actualValue?: string;
  difference?: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  passed: boolean;
}

interface Props { rules: ValidationRule[] }

export function DataValidationPanel({ rules }: Props) {
  const passed = rules.filter((r) => r.passed).length;
  const failed = rules.filter((r) => !r.passed && r.severity === 'ERROR').length;
  const warnings = rules.filter((r) => !r.passed && r.severity === 'WARNING').length;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm">
        <span className="flex items-center gap-1.5 text-green-600"><CheckCircle className="w-4 h-4" /> {passed} passed</span>
        <span className="flex items-center gap-1.5 text-red-600"><XCircle className="w-4 h-4" /> {failed} errors</span>
        <span className="flex items-center gap-1.5 text-amber-600"><AlertTriangle className="w-4 h-4" /> {warnings} warnings</span>
      </div>

      <div className="space-y-2">
        {rules.filter((r) => !r.passed).map((rule) => {
          const isError = rule.severity === 'ERROR';
          const Icon = isError ? XCircle : AlertTriangle;
          const color = isError ? 'bg-red-50 dark:bg-red-900/20 border-red-200' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200';
          const textColor = isError ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400';
          return (
            <div key={rule.ruleNumber} className={`flex items-start gap-2 p-3 rounded-md border ${color}`}>
              <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${textColor}`} />
              <div>
                <p className={`text-sm font-medium ${textColor}`}>Rule {rule.ruleNumber}: {rule.description}</p>
                {rule.expectedValue && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Expected: {rule.expectedValue} | Actual: {rule.actualValue} | Diff: {rule.difference}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
