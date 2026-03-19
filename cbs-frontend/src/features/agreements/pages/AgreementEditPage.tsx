import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAgreement, useUpdateAgreement } from '../hooks/useAgreementsExt';
import { AgreementForm } from '../components/AgreementForm';
import type { CreateCustomerAgreementPayload } from '../types/agreementExt';

export function AgreementEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const numId = Number(id);

  const { data: agreement, isLoading } = useAgreement(numId);
  const updateMutation = useUpdateAgreement();

  // Redirect non-DRAFT agreements to detail page
  useEffect(() => {
    if (agreement && agreement.status !== 'DRAFT') {
      navigate(`/agreements/${id}`, { replace: true });
    }
  }, [agreement, id, navigate]);

  const handleSubmit = (data: CreateCustomerAgreementPayload) => {
    updateMutation.mutate(
      { id: numId, data },
      {
        onSuccess: () => {
          toast.success('Agreement updated successfully');
          navigate(`/agreements/${id}`);
        },
        onError: () => toast.error('Failed to update agreement'),
      },
    );
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Edit Agreement" />
        <div className="page-container">
          <div className="animate-pulse space-y-4">
            <div className="h-52 bg-muted rounded-xl" />
            <div className="h-32 bg-muted rounded-xl" />
          </div>
        </div>
      </>
    );
  }

  if (!agreement) {
    return (
      <>
        <PageHeader title="Edit Agreement" backTo="/agreements" />
        <div className="page-container">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-medium text-muted-foreground">Agreement not found</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Edit Agreement"
        subtitle={`${agreement.agreementNumber} — ${agreement.title}`}
        backTo={`/agreements/${id}`}
        actions={
          <button
            onClick={() => navigate(`/agreements/${id}`)}
            className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel
          </button>
        }
      />
      <div className="page-container max-w-4xl">
        <AgreementForm
          initialData={agreement}
          onSubmit={handleSubmit}
          isLoading={updateMutation.isPending}
          submitLabel="Save Changes"
        />
      </div>
    </>
  );
}
