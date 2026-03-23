import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClipboardCheck, RefreshCw, Shield, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/shared';
import { useCollateralItem, useCollateralValuationHistory, useUnlinkCollateralFromLoan } from '../hooks/useCollateral';
import { CollateralDetailCard } from '../components/collateral/CollateralDetailCard';
import { CoverageAnalysis } from '../components/collateral/CoverageAnalysis';
import { ValuationTimeline } from '../components/collateral/ValuationTimeline';
import { ValuationRequestForm } from '../components/collateral/ValuationRequestForm';
import { InsuranceUpdateForm } from '../components/collateral/InsuranceUpdateForm';

type ActiveModal = 'valuation' | 'insurance' | null;

export function CollateralDetailPage() {
  const { id } = useParams<{ id: string }>();
  const collateralId = Number(id);
  const navigate = useNavigate();

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const { data: collateral, isLoading } = useCollateralItem(collateralId);
  const { data: valuationHistory = [], isLoading: loadingHistory } =
    useCollateralValuationHistory(collateralId);
  const unlinkMutation = useUnlinkCollateralFromLoan();
  const isPerfecting = false;
  const isReleasing = unlinkMutation.isPending;

  const handleMarkPerfected = () => {
    // Backend collateral entity has a status field but no dedicated perfection endpoint.
    // The collateral status is managed via the registration POST.
    toast.info('Perfection status is tracked at registration. Update the collateral record to mark as perfected.');
  };

  const handleRelease = () => {
    // Release = remove lien from all linked loan accounts
    // Backend: DELETE /{collateralId}/lien/{loanAccountId}
    if (!confirm('Release all liens on this collateral? This removes collateral coverage from linked loans.')) return;
    // For full release we'd need to know linked loanAccountIds.
    // Without them, inform the user to use the loan detail page.
    toast.info('To release a lien, go to the linked loan detail page and unlink this collateral.');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-muted-foreground animate-pulse">Loading collateral…</div>
      </div>
    );
  }

  if (!collateral) {
    return (
      <EmptyState
        title="Collateral not found"
        description="The collateral item you are looking for does not exist or has been removed."
        action={{ label: 'Back to Register', onClick: () => navigate('/lending/collateral') }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-0 pb-8">
      <PageHeader
        title={collateral.collateralNumber}
        subtitle={`${collateral.type.replace(/_/g, ' ')} · ${collateral.description}`}
        backTo="/lending/collateral"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveModal('valuation')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Request Valuation
            </button>
            <button
              onClick={() => setActiveModal('insurance')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              Update Insurance
            </button>
            {collateral.perfectionStatus !== 'PERFECTED' && (
              <button
                onClick={handleMarkPerfected}
                disabled={isPerfecting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-green-300 text-green-700 text-sm font-medium hover:bg-green-50 disabled:opacity-50 transition-colors"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                Mark Perfected
              </button>
            )}
            <button
              onClick={handleRelease}
              disabled={isReleasing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Release
            </button>
          </div>
        }
      />

      {/* Modal overlays */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-background rounded-xl border shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-base font-semibold">
                {activeModal === 'valuation' ? 'Request Valuation' : 'Update Insurance'}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              {activeModal === 'valuation' ? (
                <ValuationRequestForm
                  collateralId={collateralId}
                  onSuccess={() => setActiveModal(null)}
                  onCancel={() => setActiveModal(null)}
                />
              ) : (
                <InsuranceUpdateForm
                  collateralId={collateralId}
                  onSuccess={() => setActiveModal(null)}
                  onCancel={() => setActiveModal(null)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="px-6 pt-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-4">
            <CollateralDetailCard collateral={collateral} />
            <CoverageAnalysis collateral={collateral} />
          </div>

          {/* Right column */}
          <div>
            <div className="surface-card shadow-sm">
              <div className="p-5 border-b">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Valuation History
                </h3>
              </div>
              <div className="p-5">
                <ValuationTimeline
                  data={valuationHistory}
                  currency={collateral.currency}
                  isLoading={loadingHistory}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
