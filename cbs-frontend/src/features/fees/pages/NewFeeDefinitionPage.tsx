import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { FeeCalculationEditor } from '../components/FeeCalculationEditor';
import { createFeeDefinition, type FeeDefinition } from '../api/feeApi';

export function NewFeeDefinitionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: Partial<FeeDefinition>) =>
      createFeeDefinition(data as Omit<FeeDefinition, 'id' | 'createdAt'>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-definitions'] });
      navigate('/admin/fees');
    },
  });

  return (
    <>
      <PageHeader
        title="New Fee Definition"
        subtitle="Configure a new fee or charge for applicable products"
        backTo="/admin/fees"
      />

      <div className="page-container max-w-4xl">
        {mutation.isError && (
          <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            Failed to create fee definition. Please check your inputs and try again.
          </div>
        )}

        <FeeCalculationEditor
          mode="create"
          onSubmit={(data) => mutation.mutate(data)}
          isSubmitting={mutation.isPending}
        />
      </div>
    </>
  );
}
