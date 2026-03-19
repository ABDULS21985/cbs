import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProductWizard } from '../components/products/ProductWizard';
import { createProduct, getProductById, type BankingProduct } from '../api/productApi';

export function ProductCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cloneId = searchParams.get('clone');

  const { data: cloneSource } = useQuery({
    queryKey: ['product', cloneId],
    queryFn: () => getProductById(cloneId!),
    enabled: !!cloneId,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<BankingProduct>) => createProduct(data),
    onSuccess: (product) => {
      navigate(`/admin/products/${product.id}`);
    },
  });

  const handleComplete = (product: Partial<BankingProduct>) => {
    createMutation.mutate(product);
  };

  const handleCancel = () => {
    navigate('/admin/products');
  };

  // Build initial data from clone source (strip id, reset status/version)
  const initialData = cloneSource
    ? {
        ...cloneSource,
        id: undefined,
        code: `${cloneSource.code}-COPY`,
        name: `${cloneSource.name} (Copy)`,
        status: 'DRAFT' as const,
        version: 1,
        activeAccounts: 0,
        totalBalance: 0,
        revenueMTD: 0,
      }
    : undefined;

  return (
    <>
      <PageHeader
        title={cloneId ? 'Clone Product' : 'Create Product'}
        subtitle={cloneId ? `Cloning from ${cloneSource?.name ?? '...'}` : 'Use the wizard to define a new banking product'}
        backTo="/admin/products"
      />
      <div className="page-container">
        {createMutation.isError && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            Failed to create product. Please try again.
          </div>
        )}
        <ProductWizard
          onComplete={handleComplete}
          onCancel={handleCancel}
          initialData={initialData}
        />
      </div>
    </>
  );
}
