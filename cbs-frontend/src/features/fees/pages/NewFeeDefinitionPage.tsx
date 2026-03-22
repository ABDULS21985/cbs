import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { FeeCalculationEditor } from '../components/FeeCalculationEditor';
import { FeeTemplateSelector } from '../components/FeeTemplateSelector';
import { createFeeDefinition, type FeeDefinition } from '../api/feeApi';
import { feeKeys } from '../hooks/useFees';

export function NewFeeDefinitionPage() {
  useEffect(() => { document.title = 'New Fee Definition | CBS'; }, []);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Check for clone data passed via router state
  const cloneData = (location.state as { cloneData?: Partial<FeeDefinition> } | null)?.cloneData;

  const [showTemplate, setShowTemplate] = useState(!cloneData);
  const [templateData, setTemplateData] = useState<Partial<FeeDefinition> | undefined>(cloneData ?? undefined);

  const mutation = useMutation({
    mutationFn: (data: Partial<FeeDefinition>) =>
      createFeeDefinition(data as Omit<FeeDefinition, 'id' | 'createdAt'>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feeKeys.definitions() });
      toast.success('Fee definition created');
      navigate('/admin/fees');
    },
  });

  const handleTemplateSelect = (data: Partial<FeeDefinition> | null) => {
    setTemplateData(data ?? undefined);
    setShowTemplate(false);
  };

  return (
    <>
      <PageHeader
        title={cloneData ? 'Clone Fee Definition' : 'New Fee Definition'}
        subtitle={
          showTemplate
            ? 'Choose a template to get started quickly'
            : cloneData
              ? 'Review and modify the cloned fee definition'
              : 'Configure a new fee or charge for applicable products'
        }
        backTo="/admin/fees"
      />

      <div className="page-container max-w-4xl">
        {mutation.isError && (
          <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            Failed to create fee definition. Please check your inputs and try again.
          </div>
        )}

        {showTemplate ? (
          <div className="rounded-xl border bg-card p-6">
            <FeeTemplateSelector onSelect={handleTemplateSelect} />
          </div>
        ) : (
          <>
            {!cloneData && (
              <button
                type="button"
                onClick={() => setShowTemplate(true)}
                className="mb-4 flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
              >
                <ArrowLeft className="w-3 h-3" /> Back to templates
              </button>
            )}
            <FeeCalculationEditor
              mode="create"
              initialData={templateData}
              onSubmit={(data) => mutation.mutate(data)}
              isSubmitting={mutation.isPending}
            />
          </>
        )}
      </div>
    </>
  );
}
