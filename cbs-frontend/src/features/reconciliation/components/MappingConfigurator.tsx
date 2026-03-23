import { useState, useEffect, useMemo } from 'react';
import { Save, FolderOpen, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type MappableField = 'date' | 'valueDate' | 'reference' | 'narration' | 'amount' | 'direction' | 'balance' | 'ignore';

interface ColumnMapping {
  columnIndex: number;
  columnHeader: string;
  mappedTo: MappableField;
}

interface MappingTemplate {
  name: string;
  bankName: string;
  mappings: ColumnMapping[];
  createdAt: string;
}

interface MappingConfiguratorProps {
  csvHeaders: string[];
  previewRows: string[][];
  bankName: string;
  onApply: (mappings: ColumnMapping[]) => void;
}

const FIELD_OPTIONS: Array<{ value: MappableField; label: string }> = [
  { value: 'ignore', label: '-- Ignore --' },
  { value: 'date', label: 'Date' },
  { value: 'valueDate', label: 'Value Date' },
  { value: 'reference', label: 'Reference' },
  { value: 'narration', label: 'Narration' },
  { value: 'amount', label: 'Amount' },
  { value: 'direction', label: 'D/C Indicator' },
  { value: 'balance', label: 'Balance' },
];

const STORAGE_KEY = 'recon_mapping_templates';

function loadTemplates(): MappingTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTemplates(templates: MappingTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

function autoDetectField(header: string, sampleValues: string[]): MappableField {
  const h = header.toLowerCase().trim();

  if (/\bvalue\s*date\b/i.test(h)) return 'valueDate';
  if (/\bdate\b/i.test(h) || /\bposting\b/i.test(h)) return 'date';
  if (/\bref(erence)?\b/i.test(h) || /\btxn\s*id\b/i.test(h)) return 'reference';
  if (/\bnarr(ation)?\b/i.test(h) || /\bdesc(ription)?\b/i.test(h) || /\bparticulars\b/i.test(h)) return 'narration';
  if (/\bbal(ance)?\b/i.test(h)) return 'balance';
  if (/\b(d[\s/]?c|dr[\s/]?cr|type|direction)\b/i.test(h)) return 'direction';
  if (/\bamount\b/i.test(h) || /\bdebit\b/i.test(h) || /\bcredit\b/i.test(h)) return 'amount';

  // Heuristic: check sample values
  const allNumeric = sampleValues.every((v) => /^[+-]?[\d,]+\.?\d*$/.test(v.trim()));
  if (allNumeric && sampleValues.length > 0) return 'amount';

  const allDC = sampleValues.every((v) => /^[DC]$/i.test(v.trim()) || /^(debit|credit)$/i.test(v.trim()));
  if (allDC && sampleValues.length > 0) return 'direction';

  const allDates = sampleValues.every((v) => /\d{2,4}[-/]\d{2}[-/]\d{2,4}/.test(v.trim()));
  if (allDates && sampleValues.length > 0) return 'date';

  return 'ignore';
}

export function MappingConfigurator({ csvHeaders, previewRows, bankName, onApply }: MappingConfiguratorProps) {
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [templates, setTemplates] = useState<MappingTemplate[]>(loadTemplates);
  const [templateName, setTemplateName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const bankTemplates = useMemo(() => templates.filter((t) => t.bankName === bankName), [templates, bankName]);

  // Initialize mappings with auto-detect
  useEffect(() => {
    const initial: ColumnMapping[] = csvHeaders.map((header, idx) => {
      const sampleValues = previewRows.map((row) => row[idx] || '').filter(Boolean);
      return {
        columnIndex: idx,
        columnHeader: header,
        mappedTo: autoDetectField(header, sampleValues),
      };
    });
    setMappings(initial);
  }, [csvHeaders, previewRows]);

  const updateMapping = (idx: number, field: MappableField) => {
    setMappings((prev) => prev.map((m, i) => (i === idx ? { ...m, mappedTo: field } : m)));
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    const newTemplate: MappingTemplate = {
      name: templateName.trim(),
      bankName,
      mappings,
      createdAt: new Date().toISOString(),
    };
    const updated = [...templates.filter((t) => !(t.bankName === bankName && t.name === templateName.trim())), newTemplate];
    setTemplates(updated);
    saveTemplates(updated);
    setTemplateName('');
  };

  const handleLoadTemplate = (name: string) => {
    const template = bankTemplates.find((t) => t.name === name);
    if (!template) return;
    setSelectedTemplate(name);
    // Apply template mappings by matching column headers
    setMappings((prev) =>
      prev.map((m) => {
        const templateMapping = template.mappings.find((tm) => tm.columnHeader === m.columnHeader);
        return templateMapping ? { ...m, mappedTo: templateMapping.mappedTo } : m;
      }),
    );
  };

  const handleAutoDetect = () => {
    const detected: ColumnMapping[] = csvHeaders.map((header, idx) => {
      const sampleValues = previewRows.map((row) => row[idx] || '').filter(Boolean);
      return {
        columnIndex: idx,
        columnHeader: header,
        mappedTo: autoDetectField(header, sampleValues),
      };
    });
    setMappings(detected);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleAutoDetect}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
        >
          <Wand2 className="w-3.5 h-3.5" />
          Auto-Detect
        </button>

        {bankTemplates.length > 0 && (
          <select
            value={selectedTemplate}
            onChange={(e) => handleLoadTemplate(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Load Template...</option>
            {bankTemplates.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        )}

        <div className="ml-auto flex items-center gap-2">
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Template name..."
            className="rounded-lg border bg-background px-3 py-2 text-xs w-40 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            onClick={handleSaveTemplate}
            disabled={!templateName.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            Save Template
          </button>
        </div>
      </div>

      {/* Preview Table + Mapping */}
      <div className="surface-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Column Mapping (first 5 rows preview)
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              {/* Mapping dropdowns row */}
              <tr className="border-b bg-primary/5">
                {mappings.map((m, idx) => (
                  <th key={idx} className="px-3 py-2">
                    <select
                      value={m.mappedTo}
                      onChange={(e) => updateMapping(idx, e.target.value as MappableField)}
                      className={cn(
                        'w-full rounded border bg-background px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40',
                        m.mappedTo !== 'ignore' ? 'border-primary text-primary' : 'border-input text-muted-foreground',
                      )}
                    >
                      {FIELD_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </th>
                ))}
              </tr>
              {/* CSV headers */}
              <tr className="border-b bg-muted/20">
                {csvHeaders.map((h, idx) => (
                  <th key={idx} className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.slice(0, 5).map((row, rIdx) => (
                <tr key={rIdx} className="border-b last:border-0">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply */}
      <div className="flex justify-end">
        <button
          onClick={() => onApply(mappings.filter((m) => m.mappedTo !== 'ignore'))}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <FolderOpen className="w-4 h-4" />
          Apply Mapping
        </button>
      </div>
    </div>
  );
}
