import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useFacilities } from '../hooks/useFacilities';
import { FacilityTable } from '../components/facility/FacilityTable';
import type { CreditFacility } from '../types/facility';

export function FacilityListPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useFacilities();

  const facilities: CreditFacility[] = data ?? [];

  return (
    <div className="flex flex-col gap-4 pb-8">
      <PageHeader
        title="Credit Facilities"
        subtitle="Manage and monitor revolving, term, and other credit facilities"
        actions={
          <button
            onClick={() => navigate('/lending/facilities/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Facility
          </button>
        }
      />
      <div className="px-6">
        <FacilityTable
          data={facilities}
          isLoading={isLoading}
          onRowClick={(row) => navigate(`/lending/facilities/${row.id}`)}
        />
      </div>
    </div>
  );
}
