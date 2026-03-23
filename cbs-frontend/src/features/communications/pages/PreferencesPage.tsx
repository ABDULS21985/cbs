import { useState, useEffect } from 'react';
import { Search, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { OptInOutManager } from '../components/OptInOutManager';

export function PreferencesPage() {
  useEffect(() => { document.title = 'Communication Preferences | CBS'; }, []);
  const [customerId, setCustomerId] = useState<number>(0);
  const [searchInput, setSearchInput] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(searchInput, 10);
    if (parsed > 0) setCustomerId(parsed);
  };

  return (
    <>
      <PageHeader title="Communication Preferences" subtitle="Manage customer notification opt-in/out preferences per channel and category" />

      <div className="page-container space-y-6">
        {/* Customer search */}
        <div className="surface-card p-5">
          <form onSubmit={handleSearch} className="flex items-end gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Customer ID</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
                  placeholder="Enter customer ID..." className="w-full pl-10 pr-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
            <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
              <Search className="w-4 h-4" /> Load Preferences
            </button>
          </form>
        </div>

        {/* Preference matrix */}
        {customerId > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Customer #{customerId}</span>
            </div>
            <OptInOutManager customerId={customerId} />
          </div>
        ) : (
          <div className="surface-card p-12 text-center">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Enter a customer ID above to load their communication preferences.</p>
          </div>
        )}
      </div>
    </>
  );
}
