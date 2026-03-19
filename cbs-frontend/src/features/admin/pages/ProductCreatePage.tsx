import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { ProductWizard } from '../components/products/ProductWizard';
import { createProduct, type BankingProduct } from '../api/productApi';

export function ProductCreatePage() {
  const navigate = useNavigate();

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

  return (
    <>
      <PageHeader
        title="Create Product"
        subtitle="Use the wizard to define a new banking product"
        backTo="/admin/products"
      />
      <div className="page-container">
        {createMutation.isError && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            Failed to create product. Please try again.
          </div>
        )}
        <ProductWizard onComplete={handleComplete} onCancel={handleCancel} />
      </div>
    </>
  );
}
