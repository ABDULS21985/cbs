import { useState } from 'react';
import {
  FileText,
  Wand2,
  Download,
  Search,
  ChevronDown,
  Code2,
  Save,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/formatters';
import { apiGet } from '@/lib/api';
import type { DocumentTemplate } from '../../api/documentApi';

interface DocumentTemplateEditorProps {
  templates: DocumentTemplate[];
  onGenerate: (templateId: string, entityId: string, entityType: string) => void;
}

type EntityType = 'customer' | 'loan' | 'account';

function substituteFields(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, field) => data[field] ?? match);
}

function buildTemplateBody(template: DocumentTemplate, data: Record<string, string>): string {
  const bodies: Record<string, string> = {
    'tpl-001': `Dear {{customerName}},

We are delighted to welcome you to CBA Bank Limited!

Your {{accountType}} has been successfully opened at our {{branchName}}.

Account Details:
  Account Number: {{accountNumber}}
  Account Type: {{accountType}}
  Date Opened: {{openingDate}}

Your dedicated Relationship Manager is {{rmName}}, who will be happy to assist you with any banking needs.

Thank you for choosing CBA Bank. We look forward to serving you.

Yours sincerely,
General Manager, Retail Banking
CBA Bank Limited`,

    'tpl-002': `ACCOUNT STATEMENT

Customer Name: {{customerName}}
Account Number: {{accountNumber}}
Statement Period: {{statementPeriodFrom}} to {{statementPeriodTo}}
Currency: {{currency}}

Opening Balance: {{openingBalance}}
Closing Balance: {{closingBalance}}

[Transaction records would appear here]

This statement is computer-generated and valid without signature.
CBA Bank Limited — Licensed by the Central Bank of Nigeria`,

    'tpl-003': `LOAN OFFER LETTER

Dear {{customerName}},

We are pleased to offer you a loan facility with the following terms:

Loan Reference: {{loanRef}}
Loan Amount: {{loanAmount}}
Purpose: {{purposeOfLoan}}
Tenor: {{tenor}}
Interest Rate: {{interestRate}} per annum
Monthly Repayment: {{monthlyRepayment}}
Offer Valid Until: {{expiryDate}}

Please note this offer is subject to you executing all relevant loan documentation.

This offer was approved on {{approvalDate}}.

Yours faithfully,
Head, Consumer Lending
CBA Bank Limited`,

    'tpl-004': `FIXED DEPOSIT CERTIFICATE

Reference: {{fdReference}}
Customer Name: {{customerName}}

This is to certify that the above-named customer has placed a Fixed Deposit with CBA Bank:

Principal Amount: {{principalAmount}}
Interest Rate: {{interestRate}}
Tenor: {{tenor}}
Value Date: {{valueDate}}
Maturity Date: {{maturityDate}}
Maturity Amount: {{maturityAmount}}

This certificate is not transferable. Early liquidation may attract penalties.

Issued by: CBA Bank Limited
Licensed by the Central Bank of Nigeria`,

    'tpl-005': `TO WHOM IT MAY CONCERN

BANK REFERENCE LETTER

This is to certify that {{customerName}} has maintained a banking relationship with CBA Bank Limited since {{bankingRelationshipSince}}.

The customer's account ({{accountNumber}}) has been conducted in a satisfactory manner. Their average monthly balance is {{averageBalance}}.

This reference is issued without liability on our part.

Addressed to: {{addressedTo}}
Date Issued: {{issuedDate}}

For: CBA Bank Limited`,

    'tpl-006': `ACCOUNT CONFIRMATION LETTER

Date: {{issuedDate}}

This is to confirm that {{customerName}} maintains an account with CBA Bank Limited.

Account Number: {{accountNumber}}
Account Type: {{accountType}}
BVN: {{bvn}}
Registered Address: {{addressLine1}}, {{city}}, {{state}}

This letter is issued for the purpose of {{purposeOfLetter}}.

For: CBA Bank Limited
Licensed by the Central Bank of Nigeria`,
  };

  const body = bodies[template.id] ?? `[Template body for ${template.name}]`;
  return substituteFields(body, data);
}

export function DocumentTemplateEditor({ templates, onGenerate }: DocumentTemplateEditorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [entityType, setEntityType] = useState<EntityType>('customer');
  const [entityIdInput, setEntityIdInput] = useState('');
  const [lookedUpEntity, setLookedUpEntity] = useState<{ id: string; name: string; data: Record<string, string> } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [editorMode, setEditorMode] = useState(false);
  const [templateBody, setTemplateBody] = useState('');
  const [templateSaved, setTemplateSaved] = useState(false);

  async function handleLookup() {
    if (!entityIdInput.trim()) return;
    setLookupLoading(true);
    setLookupError('');
    setLookedUpEntity(null);
    try {
      const result = await apiGet<{ id: string; name: string; data: Record<string, string> }>(
        `/api/v1/documents/entity-lookup`,
        { entityType, entityId: entityIdInput.trim() },
      );
      if (result) {
        setLookedUpEntity(result);
        setEntityIdInput(result.id);
      } else {
        setLookupError(`No ${entityType} found with ID "${entityIdInput.trim()}".`);
      }
    } catch {
      setLookupError(`No ${entityType} found with ID "${entityIdInput.trim()}".`);
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleGenerate() {
    if (!selectedTemplate || !lookedUpEntity) return;
    setGenerating(true);
    try {
      onGenerate(selectedTemplate.id, lookedUpEntity.id, entityType);
      setGenerated(true);
    } finally {
      setGenerating(false);
    }
  }

  function handleSaveTemplate() {
    setTemplateSaved(true);
    setTimeout(() => setTemplateSaved(false), 2500);
  }

  const previewText =
    selectedTemplate && lookedUpEntity
      ? buildTemplateBody(selectedTemplate, lookedUpEntity.data)
      : null;

  const defaultTemplateBody =
    selectedTemplate
      ? buildTemplateBody(selectedTemplate, Object.fromEntries(selectedTemplate.mergeFields.map((f) => [f, `{{${f}}}`])))
      : '';

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Document Generation</h3>
        <button
          onClick={() => {
            setEditorMode(!editorMode);
            if (!editorMode && selectedTemplate) {
              setTemplateBody(defaultTemplateBody);
            }
          }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors',
            editorMode
              ? 'bg-primary/10 border-primary text-primary'
              : 'border-border hover:bg-muted',
          )}
        >
          <Code2 className="w-3.5 h-3.5" />
          {editorMode ? 'Exit Editor' : 'Template Editor'}
        </button>
      </div>

      <div className={cn('grid gap-6', editorMode ? 'grid-cols-1' : 'lg:grid-cols-2')}>
        {/* Left Column: Entity + Template Selection */}
        <div className="space-y-5">
          {/* Entity Selection */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              1. Select Entity
            </h4>
            <div className="space-y-3">
              <div className="relative">
                <select
                  value={entityType}
                  onChange={(e) => {
                    setEntityType(e.target.value as EntityType);
                    setLookedUpEntity(null);
                    setLookupError('');
                  }}
                  className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="customer">Customer</option>
                  <option value="loan">Loan</option>
                  <option value="account">Account</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={entityIdInput}
                  onChange={(e) => {
                    setEntityIdInput(e.target.value);
                    setLookupError('');
                    setLookedUpEntity(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                  placeholder={
                    entityType === 'customer'
                      ? 'e.g. CUS-000142'
                      : entityType === 'loan'
                        ? 'e.g. LN-20250887'
                        : 'e.g. FD-20261002'
                  }
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50 font-mono"
                />
                <button
                  onClick={handleLookup}
                  disabled={lookupLoading || !entityIdInput.trim()}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    !entityIdInput.trim()
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90',
                  )}
                >
                  {lookupLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Lookup
                </button>
              </div>

              {lookupError && (
                <p className="text-xs text-red-600 dark:text-red-400">{lookupError}</p>
              )}

              {lookedUpEntity && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-green-800 dark:text-green-300">
                      {lookedUpEntity.name}
                    </p>
                    <p className="text-[10px] text-green-600 dark:text-green-500">
                      {lookedUpEntity.id}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Template Selection */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              2. Select Template
            </h4>
            <div className="space-y-2">
              {templates.map((tpl) => {
                const isSelected = selectedTemplate?.id === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      setSelectedTemplate(tpl);
                      setGenerated(false);
                      if (editorMode) {
                        setTemplateBody(buildTemplateBody(tpl, Object.fromEntries(tpl.mergeFields.map((f) => [f, `{{${f}}}`]))));
                      }
                    }}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40 hover:bg-muted/30',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={cn('text-sm font-semibold', isSelected && 'text-primary')}>
                          {tpl.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                        ×{tpl.generatedCount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tpl.mergeFields.map((f) => (
                        <span
                          key={f}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono"
                        >
                          {`{{${f}}}`}
                        </span>
                      ))}
                    </div>
                    {tpl.lastGenerated && (
                      <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                        Last used: {formatDate(tpl.lastGenerated)}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Preview / Editor */}
        <div className="space-y-4">
          {editorMode ? (
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Template Body Editor
                </h4>
                {selectedTemplate && (
                  <span className="text-xs text-muted-foreground">{selectedTemplate.name}</span>
                )}
              </div>

              {/* Merge Field Toolbar */}
              {selectedTemplate && (
                <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-muted/30 rounded-lg border border-border">
                  <span className="text-[10px] text-muted-foreground font-medium self-center">
                    Insert:
                  </span>
                  {selectedTemplate.mergeFields.map((field) => (
                    <button
                      key={field}
                      onClick={() => setTemplateBody((prev) => prev + `{{${field}}}`)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 font-mono transition-colors"
                    >
                      {`{{${field}}}`}
                    </button>
                  ))}
                </div>
              )}

              <textarea
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                placeholder={selectedTemplate ? 'Edit template body...' : 'Select a template to edit...'}
                className="w-full h-64 p-3 text-xs font-mono rounded-lg border border-border bg-muted/20 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none leading-relaxed"
              />

              <div className="flex justify-end mt-3">
                <button
                  onClick={handleSaveTemplate}
                  disabled={!selectedTemplate || !templateBody.trim()}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    templateSaved
                      ? 'bg-green-600 text-white'
                      : !selectedTemplate || !templateBody.trim()
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90',
                  )}
                >
                  {templateSaved ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Template Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  3. Preview & Generate
                </h4>
                {selectedTemplate && lookedUpEntity && (
                  <span className="text-[10px] text-green-600 font-medium">Fields populated</span>
                )}
              </div>

              {selectedTemplate && lookedUpEntity && previewText ? (
                <div>
                  <div className="mb-3 p-4 bg-white dark:bg-gray-900 rounded-lg border border-border font-mono text-xs leading-relaxed whitespace-pre-wrap text-foreground/80 max-h-80 overflow-y-auto">
                    {previewText}
                  </div>

                  {!generated ? (
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className={cn(
                        'w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors',
                        generating
                          ? 'bg-muted text-muted-foreground cursor-not-allowed'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90',
                      )}
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating…
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4" />
                          Generate Document
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                        <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                          Document generated successfully
                        </span>
                      </div>
                      <button
                        onClick={() => setGenerated(false)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download Document
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No preview yet</p>
                  <p className="text-xs mt-1 text-center">
                    Select a template and look up an entity to preview
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
