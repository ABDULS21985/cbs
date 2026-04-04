import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProductWizard } from '../components/products/ProductWizard';
import {
  createProduct,
  getProductByCode,
  getProductById,
  type BankingProduct,
} from '../api/productApi';
import {
  createIslamicProduct,
  getIslamicProductByCode,
  submitIslamicProductForApproval,
} from '../api/islamicProductApi';
import {
  buildIslamicProductRequest,
  isIslamicCategory,
  mapIslamicProductToDraft,
} from '../lib/islamicProductMapper';

export function ProductCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cloneId = searchParams.get('clone');

  const { data: cloneSource } = useQuery({
    queryKey: ['product', cloneId],
    queryFn: () => getProductById(cloneId!),
    enabled: !!cloneId,
  });

  const { data: cloneIslamicSource } = useQuery({
    queryKey: ['islamic-product-clone', cloneSource?.code],
    queryFn: () => getIslamicProductByCode(cloneSource!.code),
    enabled: !!cloneSource && isIslamicCategory(cloneSource.category),
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<BankingProduct>) => {
      if (isIslamicCategory(data.category)) {
        const islamicProduct = await createIslamicProduct(buildIslamicProductRequest(data));
        if (data.status === 'ACTIVE') {
          await submitIslamicProductForApproval(islamicProduct.id);
        }
        return getProductByCode(islamicProduct.productCode ?? data.code ?? '');
      }

      const conventionalPayload = { ...data };
      delete conventionalPayload.islamicConfig;
      return createProduct(conventionalPayload);
    },
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
          islamicConfig: cloneIslamicSource ? mapIslamicProductToDraft(cloneIslamicSource) : undefined,
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
            Failed to create product. Review the Islamic contract fields and fatwa linkage, then try again.
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
