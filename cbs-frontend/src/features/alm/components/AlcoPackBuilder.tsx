import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { GripVertical, Check, Eye } from 'lucide-react';

const ALL_SECTIONS = [
  { id: 'executive-summary', label: 'Executive Summary' },
  { id: 'gap-analysis', label: 'Gap Analysis' },
  { id: 'duration-report', label: 'Duration Report' },
  { id: 'nii-sensitivity', label: 'NII Sensitivity' },
  { id: 'eve-analysis', label: 'EVE Analysis' },
  { id: 'liquidity-position', label: 'Liquidity Position' },
  { id: 'stress-test-results', label: 'Stress Test Results' },
  { id: 'limit-utilization', label: 'Limit Utilization' },
  { id: 'action-items', label: 'Action Items from Last Meeting' },
  { id: 'appendix', label: 'Appendix' },
] as const;

interface AlcoPackBuilderProps {
  selectedSections: string[];
  onSectionsChange: (sections: string[]) => void;
  onPreview: () => void;
}

export function AlcoPackBuilder({
  selectedSections,
  onSectionsChange,
  onPreview,
}: AlcoPackBuilderProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const toggleSection = (id: string) => {
    if (selectedSections.includes(id)) {
      onSectionsChange(selectedSections.filter((s) => s !== id));
    } else {
      onSectionsChange([...selectedSections, id]);
    }
  };

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback(
    (index: number) => {
      if (dragIndex === null || dragIndex === index) {
        setDragIndex(null);
        setDragOverIndex(null);
        return;
      }
      const updated = [...selectedSections];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(index, 0, moved);
      onSectionsChange(updated);
      setDragIndex(null);
      setDragOverIndex(null);
    },
    [dragIndex, selectedSections, onSectionsChange],
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Pack Sections</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select and reorder sections for this month's ALCO pack
          </p>
        </div>
        <button
          onClick={onPreview}
          disabled={selectedSections.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Eye className="w-3.5 h-3.5" />
          Preview Pack
        </button>
      </div>

      {/* Section selection */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {ALL_SECTIONS.map((section) => {
          const isSelected = selectedSections.includes(section.id);
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => toggleSection(section.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors text-left',
                isSelected
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-primary/30 text-muted-foreground',
              )}
            >
              <div
                className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                  isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30',
                )}
              >
                {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
              <span className="truncate">{section.label}</span>
            </button>
          );
        })}
      </div>

      {/* Reorder selected sections */}
      {selectedSections.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            Drag to reorder ({selectedSections.length} section{selectedSections.length !== 1 ? 's' : ''} selected)
          </p>
          <div className="space-y-1">
            {selectedSections.map((sectionId, index) => {
              const section = ALL_SECTIONS.find((s) => s.id === sectionId);
              if (!section) return null;
              return (
                <div
                  key={sectionId}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 surface-card cursor-move transition-all',
                    dragOverIndex === index && 'border-primary bg-primary/5',
                    dragIndex === index && 'opacity-50',
                  )}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground w-5">{index + 1}.</span>
                  <span className="text-sm">{section.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export { ALL_SECTIONS };
