import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { SummaryBar } from '@/components/shared';
import { useCollateralList } from '../hooks/useCollateral';
import { CollateralTable } from '../components/collateral/CollateralTable';
import { CollateralRegistrationForm } from '../components/collateral/CollateralRegistrationForm';
import type { Collateral } from '../types/collateral';

export function CollateralRegisterPage() {
  const navigate = useNavigate();
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  const { data, isLoading } = useCollateralList();
  const items: Collateral[] = data ?? [];

  const totalValue = items.reduce((sum, c) => sum + c.currentValue, 0);
  const pendingValuation = items.filter(
    (c) => c.perfectionStatus === 'NOT_STARTED' || c.perfectionStatus === 'IN_PROGRESS'
  ).length;
  const expiredInsurance = items.filter(
    (c) => c.insuranceStatus === 'EXPIRED' || c.insuranceStatus === 'EXPIRING'
  ).length;

  return (
    <div className="flex flex-col gap-4 pb-8">
      <PageHeader
        title="Collateral Register"
        subtitle="Track and manage all collateral items pledged against credit facilities"
        actions={
          <button
            onClick={() => setShowRegisterForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {showRegisterForm ? (
              <>
                <X className="w-4 h-4" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Register Collateral
              </>
            )}
          </button>
        }
      />

      <div className="px-6 space-y-4">
        <SummaryBar
          items={[
            { label: 'Total Value', value: totalValue, format: 'money', currency: 'NGN' },
            { label: 'Items', value: items.length, format: 'number' },
            {
              label: 'Pending Valuation / Perfection',
              value: pendingValuation,
              format: 'number',
              color: pendingValuation > 0 ? 'warning' : 'default',
            },
            {
              label: 'Expiring / Expired Insurance',
              value: expiredInsurance,
              format: 'number',
              color: expiredInsurance > 0 ? 'danger' : 'default',
            },
          ]}
        />

        {showRegisterForm && (
          <div className="p-6 border rounded-xl bg-card shadow-sm">
            <h3 className="text-base font-semibold mb-4">Register New Collateral</h3>
            <CollateralRegistrationForm
              onSuccess={() => setShowRegisterForm(false)}
              onCancel={() => setShowRegisterForm(false)}
            />
          </div>
        )}

        <CollateralTable
          data={items}
          isLoading={isLoading}
          onRowClick={(row) => navigate(`/lending/collateral/${row.id}`)}
        />
      </div>
    </div>
  );
}
