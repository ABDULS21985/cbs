import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { AgreementTable } from '../components/AgreementTable';
import { agreementApi } from '../api/agreementApi';

export function AgreementListPage() {
  const navigate = useNavigate();
  const [filters] = useState<Record<string, unknown>>({});

  const { data: agreements = [], isLoading } = useQuery({
    queryKey: ['agreements', 'list', filters],
    queryFn: () => agreementApi.getAll(filters),
  });

  return (
    <>
      <PageHeader
        title="Agreements"
        subtitle="Manage customer agreements, mandates and T&C acceptances"
        actions={
          <button onClick={() => navigate('/agreements/new')} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4" /> New Agreement
          </button>
        }
      />
      <div className="page-container">
        <AgreementTable
          data={agreements}
          isLoading={isLoading}
          onRowClick={(row) => navigate(`/agreements/${row.id}`)}
        />
      </div>
    </>
  );
}
