import { useState, useEffect, useMemo } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  getLoanPortfolioStats,
  getDpdBuckets,
  getSectorExposure,
  getProductMix,
  getVintageData,
  getNplTrend,
  getProvisionWaterfall,
  getTopObligors,
  type LoanPortfolioStats,
  type DpdBucket,
  type SectorExposure,
  type ProductMix,
  type VintageCell,
  type NplTrendPoint,
  type ProvisionWaterfallItem,
  type TopObligor,
} from '../api/loanAnalyticsApi';
import { LoanStatsCards } from '../components/loans/LoanStatsCards';
import { DpdHeatmapMatrix, type DpdMatrixRow } from '../components/loans/DpdHeatmapMatrix';
import { DpdAgingChart } from '../components/loans/DpdAgingChart';
import { DpdAgingTable } from '../components/loans/DpdAgingTable';
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

const GEOGRAPHIC_COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899'];

function buildDpdMatrix(buckets: DpdBucket[]): DpdMatrixRow[] {
  // Build synthetic product-level DPD matrix from bucket data
  const products = ['Term Loans', 'Overdrafts', 'Mortgages', 'SME Loans', 'Personal Loans'];
  return products.map((product, idx) => {
    const factor = 0.15 + idx * 0.05;
    const currentBucket = buckets.find((b) => b.bucket === 'Current') || buckets[0];
    const base = currentBucket ? currentBucket.amount * factor : 1e9;
    return {
      product,
      current: { count: Math.round(1200 * (1 - idx * 0.1)), amount: base * 0.7 },
      dpd1_30: { count: Math.round(180 * (1 + idx * 0.15)), amount: base * 0.12 },
      dpd31_60: { count: Math.round(80 * (1 + idx * 0.2)), amount: base * 0.07 },
      dpd61_90: { count: Math.round(45 * (1 + idx * 0.25)), amount: base * 0.04 },
      dpd91_180: { count: Math.round(30 * (1 + idx * 0.3)), amount: base * 0.04 },
      dpd180plus: { count: Math.round(15 * (1 + idx * 0.35)), amount: base * 0.03 },
    };
  });
}

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
  products: ProductMix[],
  obligors: TopObligor[],
) {
  const sectorData: SectorItem[] = sectors.map((s) => ({
    sector: s.sector,
    amount: s.amount,
    pct: s.portfolioPct,
    color: s.color,
  }));

  const geographicData: GeographicItem[] = [
    { region: 'Lagos', amount: 450e9, pct: 32, color: GEOGRAPHIC_COLORS[0] },
    { region: 'Abuja', amount: 210e9, pct: 15, color: GEOGRAPHIC_COLORS[1] },
    { region: 'South-West', amount: 195e9, pct: 14, color: GEOGRAPHIC_COLORS[2] },
    { region: 'South-East', amount: 140e9, pct: 10, color: GEOGRAPHIC_COLORS[3] },
    { region: 'North-Central', amount: 126e9, pct: 9, color: GEOGRAPHIC_COLORS[4] },
    { region: 'Others', amount: 280e9, pct: 20, color: GEOGRAPHIC_COLORS[5] },
  ];

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
  const [selectedPeriod, setSelectedPeriod] = useState(PERIODS[0].value);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<LoanPortfolioStats | null>(null);
  const [dpdBuckets, setDpdBuckets] = useState<DpdBucket[]>([]);
  const [sectors, setSectors] = useState<SectorExposure[]>([]);
  const [products, setProducts] = useState<ProductMix[]>([]);
  const [vintage, setVintage] = useState<VintageCell[]>([]);
  const [nplTrend, setNplTrend] = useState<NplTrendPoint[]>([]);
  const [waterfall, setWaterfall] = useState<ProvisionWaterfallItem[]>([]);
  const [obligors, setObligors] = useState<TopObligor[]>([]);

  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, dpd, sec, prod, vint, npl, wf, obl] = await Promise.all([
        getLoanPortfolioStats(),
        getDpdBuckets(),
        getSectorExposure(),
        getProductMix(),
        getVintageData(),
        getNplTrend(),
        getProvisionWaterfall(),
        getTopObligors(),
      ]);
      setStats(s);
      setDpdBuckets(dpd);
      setSectors(sec);
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
  const dpdMatrix = useMemo(() => buildDpdMatrix(dpdBuckets), [dpdBuckets]);
  const vintageCohorts = useMemo(() => buildVintageCohorts(vintage), [vintage]);
  const concentrationData = useMemo(
    () => buildConcentrationData(sectors, products, obligors),
    [sectors, products, obligors],
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

        {/* DPD Heatmap Matrix (replaces old DPD chart + table) */}
        {loading || dpdBuckets.length === 0 ? (
          <SectionSkeleton height={400} />
        ) : (
          <DpdHeatmapMatrix
            data={dpdMatrix}
            onCellClick={(product, bucket) => {
              console.info(`[DPD Drilldown] Product: ${product}, Bucket: ${bucket}`);
            }}
          />
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
