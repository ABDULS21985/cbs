import { useState, useEffect, useMemo } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  getLoanPortfolioStats,
  getDpdBuckets,
  getDpdMatrix,
  getSectorExposure,
  getGeographicConcentration,
  getProductMix,
  getVintageData,
  getVintageMatrix,
  getNplTrend,
  getProvisionWaterfall,
  getTopObligors,
  type LoanPortfolioStats,
  type DpdBucket,
  type DpdMatrixRow,
  type SectorExposure,
  type GeographicConcentration,
  type ProductMix,
  type VintageCell,
  type VintageCellEntry,
  type NplTrendPoint,
  type ProvisionWaterfallItem,
  type TopObligor,
} from '../api/loanAnalyticsApi';
import { LoanStatsCards } from '../components/loans/LoanStatsCards';
import { DpdAgingChart } from '../components/loans/DpdAgingChart';
import { DpdAgingTable } from '../components/loans/DpdAgingTable';
import { DpdHeatmapMatrix } from '../components/loans/DpdHeatmapMatrix';
import { VintageAnalysisChart, type VintageCohort } from '../components/loans/VintageAnalysisChart';
import { ConcentrationDashboard, type SectorItem, type GeographicItem, type ObligorItem, type ProductItem } from '../components/loans/ConcentrationDashboard';
import { ProductMixDonut } from '../components/loans/ProductMixDonut';
import { ProductMixTable } from '../components/loans/ProductMixTable';
import { VintageHeatmap } from '../components/loans/VintageHeatmap';
import { NplTrendChart } from '../components/loans/NplTrendChart';
import { ProvisionWaterfallChart } from '../components/loans/ProvisionWaterfallChart';

const PERIODS = [
  { label: 'Feb 2026', value: '2026-02' },
  { label: 'Jan 2026', value: '2026-01' },
  { label: 'Dec 2025', value: '2025-12' },
  { label: 'Q4 2025', value: 'Q4-2025' },
  { label: 'Q3 2025', value: 'Q3-2025' },
  { label: 'YTD 2026', value: 'YTD-2026' },
];

function SectionSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="bg-card rounded-lg border border-border p-6 animate-pulse" style={{ height }}>
      <div className="h-4 w-48 bg-muted rounded mb-2" />
      <div className="h-3 w-32 bg-muted rounded mb-6" />
      <div className="h-full bg-muted/40 rounded" style={{ height: height - 80 }} />
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-card rounded-lg border border-border p-6 animate-pulse space-y-3">
          <div className="h-3 w-24 bg-muted rounded" />
          <div className="h-8 w-28 bg-muted rounded" />
          <div className="h-3 w-20 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Helpers for derived data ─────────────────────────────────────────────────

function buildVintageCohorts(vintage: VintageCell[]): VintageCohort[] {
  const cohortMap: Record<string, { months: number[]; rates: number[] }> = {};
  for (const cell of vintage) {
    if (!cohortMap[cell.vintage]) {
      cohortMap[cell.vintage] = { months: [], rates: [] };
    }
    const monthNum = parseInt(cell.month.replace('M', ''), 10);
    if (!isNaN(monthNum)) {
      cohortMap[cell.vintage].months.push(monthNum);
      cohortMap[cell.vintage].rates.push(cell.defaultRate);
    }
  }
  return Object.entries(cohortMap).map(([cohort, data]) => ({
    cohort,
    months: data.months,
    defaultRates: data.rates,
  }));
}

function buildConcentrationData(
  sectors: SectorExposure[],
  geography: GeographicConcentration[],
  products: ProductMix[],
  obligors: TopObligor[],
) {
  const sectorData: SectorItem[] = sectors.map((s) => ({
    sector: s.sector,
    amount: s.amount,
    pct: s.portfolioPct,
    color: s.color,
  }));

  const geographicData: GeographicItem[] = geography.map((g) => ({
    region: g.region,
    amount: g.amount,
    pct: g.portfolioPct,
    color: g.color,
  }));

  const obligorData: ObligorItem[] = obligors.map((o) => ({
    rank: o.rank,
    name: o.name,
    exposure: o.exposure,
    capitalPct: o.portfolioPct,
    classification: o.classification,
  }));

  const totalProduct = products.reduce((s, p) => s + p.amount, 0);
  const productData: ProductItem[] = products.map((p) => ({
    product: p.product,
    amount: p.amount,
    pct: totalProduct > 0 ? (p.amount / totalProduct) * 100 : 0,
    color: p.color,
  }));

  return { sectorData, geographicData, obligorData, productData };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LoanAnalyticsPage() {
  useEffect(() => { document.title = 'Loan Analytics | CBS'; }, []);
  const [selectedPeriod, setSelectedPeriod] = useState(PERIODS[0].value);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<LoanPortfolioStats | null>(null);
  const [dpdBuckets, setDpdBuckets] = useState<DpdBucket[]>([]);
  const [dpdMatrix, setDpdMatrix] = useState<DpdMatrixRow[]>([]);
  const [sectors, setSectors] = useState<SectorExposure[]>([]);
  const [geography, setGeography] = useState<GeographicConcentration[]>([]);
  const [products, setProducts] = useState<ProductMix[]>([]);
  const [vintage, setVintage] = useState<VintageCell[]>([]);
  const [vintageMatrix, setVintageMatrix] = useState<VintageCellEntry[]>([]);
  const [vintageView, setVintageView] = useState<'simple' | 'matrix'>('matrix');
  const [nplTrend, setNplTrend] = useState<NplTrendPoint[]>([]);
  const [waterfall, setWaterfall] = useState<ProvisionWaterfallItem[]>([]);
  const [obligors, setObligors] = useState<TopObligor[]>([]);

  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, dpd, matrix, sec, geo, prod, vint, npl, wf, obl] = await Promise.all([
        getLoanPortfolioStats(),
        getDpdBuckets(),
        getDpdMatrix(),
        getSectorExposure(),
        getGeographicConcentration(),
        getProductMix(),
        getVintageData(),
        getNplTrend(),
        getProvisionWaterfall(),
        getTopObligors(),
      ]);
      setStats(s);
      setDpdBuckets(dpd);
      setDpdMatrix(matrix);
      setSectors(sec);
      setGeography(geo);
      setProducts(prod);
      setVintage(vint);
      setNplTrend(npl);
      setWaterfall(wf);
      setObligors(obl);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [selectedPeriod]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  // Derived data
  const vintageCohorts = useMemo(() => buildVintageCohorts(vintage), [vintage]);
  const concentrationData = useMemo(
    () => buildConcentrationData(sectors, geography, products, obligors),
    [sectors, geography, products, obligors],
  );

  return (
    <>
      <PageHeader
        title="Loan Portfolio Analytics"
        subtitle="Comprehensive credit risk and portfolio quality metrics"
        actions={
          <div className="flex items-center gap-2">
            {/* Period selector */}
            <div className="flex items-center gap-1 rounded-md border border-border bg-muted/30 p-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setSelectedPeriod(p.value)}
                  className={
                    selectedPeriod === p.value
                      ? 'px-3 py-1.5 text-xs font-medium rounded bg-background shadow text-foreground'
                      : 'px-3 py-1.5 text-xs font-medium rounded text-muted-foreground hover:text-foreground transition-colors'
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50"
              aria-label="Refresh data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {/* Export */}
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              aria-label="Export report"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        }
      />

      <div className="page-container space-y-6">

        {/* Stats Cards */}
        {loading || !stats ? (
          <StatsSkeleton />
        ) : (
          <LoanStatsCards stats={stats} />
        )}

        {loading || dpdMatrix.length === 0 ? (
          <SectionSkeleton height={300} />
        ) : (
          <DpdHeatmapMatrix data={dpdMatrix} />
        )}

        {/* DPD Aging — Chart + Table (kept as secondary view) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {loading || dpdBuckets.length === 0 ? (
            <>
              <SectionSkeleton height={340} />
              <SectionSkeleton height={340} />
            </>
          ) : (
            <>
              <DpdAgingChart buckets={dpdBuckets} />
              <DpdAgingTable buckets={dpdBuckets} />
            </>
          )}
        </div>

        {/* Vintage Analysis Chart (new) */}
        {loading || vintage.length === 0 ? (
          <SectionSkeleton height={380} />
        ) : (
          <VintageAnalysisChart data={vintageCohorts} />
        )}

        {/* Concentration Dashboard (replaces sector + obligor sections) */}
        {loading || (sectors.length === 0 && products.length === 0) ? (
          <SectionSkeleton height={500} />
        ) : (
          <ConcentrationDashboard
            sectorData={concentrationData.sectorData}
            geographicData={concentrationData.geographicData}
            obligorData={concentrationData.obligorData}
            productData={concentrationData.productData}
          />
        )}

        {/* Product Mix — Donut + Table */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {loading || products.length === 0 ? (
            <>
              <SectionSkeleton height={380} />
              <SectionSkeleton height={380} />
            </>
          ) : (
            <>
              <ProductMixDonut products={products} />
              <ProductMixTable products={products} />
            </>
          )}
        </div>

        {/* Vintage Heatmap — full width (existing) */}
        <div>
          {loading || vintage.length === 0 ? (
            <SectionSkeleton height={280} />
          ) : (
            <VintageHeatmap data={vintage} />
          )}
        </div>

        {/* NPL Trend — full width */}
        <div>
          {loading || nplTrend.length === 0 ? (
            <SectionSkeleton height={360} />
          ) : (
            <NplTrendChart data={nplTrend} />
          )}
        </div>

        {/* Provision Waterfall — full width */}
        <div>
          {loading || waterfall.length === 0 ? (
            <SectionSkeleton height={360} />
          ) : (
            <ProvisionWaterfallChart items={waterfall} />
          )}
        </div>

      </div>
    </>
  );
}
