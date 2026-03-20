import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard, TabsPage } from '@/components/shared';
import { BarChart3, TrendingUp, ArrowLeftRight, Briefcase } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { secPositionApi } from '../api/secPositionApi';
import { formatMoney, formatMoneyCompact } from '@/lib/formatters';
import { PositionTable } from '../components/positions/PositionTable';
import { MovementTable } from '../components/positions/MovementTable';
import { PortfolioPositionView } from '../components/positions/PortfolioPositionView';

const KEYS = {
  positions: (params?: Record<string, string>) => ['sec-positions', 'list', params],
  movements: (params?: Record<string, string>) => ['sec-positions', 'movements', params],
  portfolio: (code: string) => ['sec-positions', 'portfolio', code],
};

// ── Positions Tab ────────────────────────────────────────────────────────────

function PositionsTab() {
  const [instrumentType, setInstrumentType] = useState('');
  const [portfolioFilter, setPortfolioFilter] = useState('');

  const params: Record<string, string> = {};
  if (instrumentType) params.instrumentType = instrumentType;
  if (portfolioFilter) params.portfolioCode = portfolioFilter;

  const { data = [], isLoading } = useQuery({
    queryKey: KEYS.positions(params),
    queryFn: () => secPositionApi.getPositions(Object.keys(params).length > 0 ? params : undefined),
    staleTime: 30_000,
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Instrument Type</label>
          <select
            value={instrumentType}
            onChange={(e) => setInstrumentType(e.target.value)}
            className="h-8 px-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All Types</option>
            <option value="EQUITY">Equity</option>
            <option value="BOND">Bond</option>
            <option value="TBILL">T-Bill</option>
            <option value="DERIVATIVE">Derivative</option>
            <option value="ETF">ETF</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Portfolio</label>
          <input
            value={portfolioFilter}
            onChange={(e) => setPortfolioFilter(e.target.value)}
            placeholder="Filter by portfolio..."
            className="h-8 px-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 w-48"
          />
        </div>
      </div>
      <PositionTable data={data} isLoading={isLoading} />
    </div>
  );
}

// ── Movements Tab ────────────────────────────────────────────────────────────

function MovementsTab() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const params: Record<string, string> = {};
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;
  if (typeFilter) params.type = typeFilter;

  const { data = [], isLoading } = useQuery({
    queryKey: KEYS.movements(params),
    queryFn: () => secPositionApi.getMovements(Object.keys(params).length > 0 ? params : undefined),
    staleTime: 30_000,
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 px-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 px-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-8 px-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">All</option>
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
            <option value="TRANSFER">Transfer</option>
            <option value="CORPORATE_ACTION">Corporate Action</option>
          </select>
        </div>
      </div>
      <MovementTable data={data} isLoading={isLoading} />
    </div>
  );
}

// ── By Portfolio Tab ─────────────────────────────────────────────────────────

function ByPortfolioTab() {
  const [portfolioCode, setPortfolioCode] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: KEYS.portfolio(portfolioCode),
    queryFn: () => secPositionApi.getPortfolioPositions(portfolioCode),
    enabled: !!portfolioCode,
    staleTime: 60_000,
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Portfolio Code</label>
          <div className="flex items-center gap-2">
            <input
              value={portfolioCode}
              onChange={(e) => setPortfolioCode(e.target.value)}
              placeholder="e.g., MAIN, TRADING"
              className="h-8 px-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 w-48"
            />
          </div>
        </div>
      </div>
      <PortfolioPositionView data={data} isLoading={isLoading && !!portfolioCode} />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function SecuritiesPositionPage() {
  const { data: positions = [] } = useQuery({
    queryKey: KEYS.positions(),
    queryFn: () => secPositionApi.getPositions(),
    staleTime: 30_000,
  });

  const totalMarketValue = positions.reduce((s, p) => s + p.marketValue, 0);
  const totalPnl = positions.reduce((s, p) => s + p.unrealizedPnl, 0);

  return (
    <>
      <PageHeader
        title="Securities Positions"
        subtitle="Position tracking, securities movements, and portfolio analytics"
      />
      <div className="page-container space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Positions" value={positions.length} format="number" icon={Briefcase} />
          <StatCard label="Market Value" value={totalMarketValue} format="money" icon={BarChart3} compact />
          <StatCard
            label="Unrealized P&L"
            value={totalPnl >= 0 ? `+${formatMoneyCompact(totalPnl)}` : formatMoneyCompact(totalPnl)}
            icon={TrendingUp}
          />
          <StatCard label="Instruments" value={new Set(positions.map((p) => p.instrumentCode)).size} format="number" icon={ArrowLeftRight} />
        </div>

        <div className="card overflow-hidden">
          <TabsPage
            syncWithUrl
            tabs={[
              { id: 'positions', label: 'Positions', content: <PositionsTab /> },
              { id: 'movements', label: 'Movements', content: <MovementsTab /> },
              { id: 'portfolio', label: 'By Portfolio', content: <ByPortfolioTab /> },
            ]}
          />
        </div>
      </div>
    </>
  );
}
