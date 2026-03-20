import { apiGet } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoanPortfolioStats {
  totalPortfolio: number;
  performing: number;
  performingPct: number;
  npl: number;
  nplPct: number;
  provision: number;
  coverageRatio: number;
}

export interface DpdBucket {
  bucket: string;
  count: number;
  amount: number;
  portfolioPct: number;
  provision: number;
  coveragePct: number;
  color: string;
}

export interface DpdMatrixRow {
  product: string;
  current: { count: number; amount: number };
  dpd1_30: { count: number; amount: number };
  dpd31_60: { count: number; amount: number };
  dpd61_90: { count: number; amount: number };
  dpd91_180: { count: number; amount: number };
  dpd180plus: { count: number; amount: number };
}

export interface SectorExposure {
  sector: string;
  amount: number;
  portfolioPct: number;
  nplPct: number;
  color: string;
}

export interface GeographicConcentration {
  region: string;
  amount: number;
  portfolioPct: number;
  color: string;
}

export interface ProductMix {
  product: string;
  count: number;
  amount: number;
  nplPct: number;
  avgRate: number;
  avgTenorMonths: number;
  color: string;
}

export interface VintageCell {
  vintage: string;
  month: string;
  defaultRate: number;
}

export interface NplTrendPoint {
  month: string;
  nplAmount: number;
  nplRatio: number;
}

export interface ProvisionWaterfallItem {
  name: string;
  value: number;
  type: 'opening' | 'add' | 'reduce' | 'closing';
}

export interface TopObligor {
  rank: number;
  name: string;
  sector: string;
  exposure: number;
  portfolioPct: number;
  classification: string;
}

interface BackendLoanStats {
  totalPortfolio: number;
  nplAmount: number;
  nplRatio: number;
  provisionCoverage: number;
  totalProvisions: number;
}

interface BackendDpdBucket {
  bucket: string;
  count: number;
  amount: number;
  percentage: number;
  provision: number;
  coveragePct: number;
}

interface BackendSectorExposure {
  sector: string;
  exposure: number;
  percentage: number;
  nplPct: number;
}

interface BackendGeographicConcentration {
  region: string;
  exposure: number;
  percentage: number;
}

interface BackendProductMix {
  productName: string;
  count: number;
  amount: number;
  nplPct: number;
  avgRate: number;
  avgTenorMonths: number;
}

interface BackendProvisionWaterfall {
  opening: number;
  charge: number;
  release: number;
  writeOff: number;
  closing: number;
}

interface BackendTopObligor {
  customerName: string;
  sector?: string | null;
  exposure: number;
  percentage: number;
  delinquencyBucket?: string | null;
}

const COLORS = ['#2563eb', '#0f766e', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#4f46e5', '#16a34a'];

function colorForIndex(index: number): string {
  return COLORS[index % COLORS.length];
}

function classifyBucket(bucket?: string | null): string {
  switch (bucket) {
    case 'CURRENT': return 'PASS';
    case '1-30': return 'WATCH';
    case '31-60': return 'SUBSTANDARD';
    case '61-90': return 'DOUBTFUL';
    default: return 'LOSS';
  }
}

function dpdColor(bucket: string): string {
  switch (bucket) {
    case 'CURRENT': return '#16a34a';
    case '1-30': return '#84cc16';
    case '31-60': return '#f59e0b';
    case '61-90': return '#f97316';
    case '91-180': return '#ef4444';
    default: return '#991b1b';
  }
}

// ─── API Functions ─────────────────────────────────────────────────────────────

export function getLoanPortfolioStats(): Promise<LoanPortfolioStats> {
  return apiGet<BackendLoanStats>('/api/v1/reports/loans/stats').then((stats) => {
    const performing = Math.max(0, (stats.totalPortfolio ?? 0) - (stats.nplAmount ?? 0));
    return {
      totalPortfolio: stats.totalPortfolio ?? 0,
      performing,
      performingPct: stats.totalPortfolio > 0 ? (performing / stats.totalPortfolio) * 100 : 0,
      npl: stats.nplAmount ?? 0,
      nplPct: stats.nplRatio ?? 0,
      provision: stats.totalProvisions ?? 0,
      coverageRatio: stats.provisionCoverage ?? 0,
    };
  });
}

export function getDpdBuckets(): Promise<DpdBucket[]> {
  return apiGet<BackendDpdBucket[]>('/api/v1/reports/loans/dpd-buckets').then((buckets) =>
    buckets.map((bucket) => ({
      bucket: bucket.bucket,
      count: bucket.count ?? 0,
      amount: bucket.amount ?? 0,
      portfolioPct: bucket.percentage ?? 0,
      provision: bucket.provision ?? 0,
      coveragePct: bucket.coveragePct ?? 0,
      color: dpdColor(bucket.bucket),
    })),
  );
}

export function getDpdMatrix(): Promise<DpdMatrixRow[]> {
  return apiGet<DpdMatrixRow[]>('/api/v1/reports/loans/dpd-matrix');
}

export function getSectorExposure(): Promise<SectorExposure[]> {
  return apiGet<BackendSectorExposure[]>('/api/v1/reports/loans/sector-exposure').then((sectors) =>
    sectors.map((sector, index) => ({
      sector: sector.sector,
      amount: sector.exposure ?? 0,
      portfolioPct: sector.percentage ?? 0,
      nplPct: sector.nplPct ?? 0,
      color: colorForIndex(index),
    })),
  );
}

export function getGeographicConcentration(): Promise<GeographicConcentration[]> {
  return apiGet<BackendGeographicConcentration[]>('/api/v1/reports/loans/geographic-concentration').then((regions) =>
    regions.map((region, index) => ({
      region: region.region,
      amount: region.exposure ?? 0,
      portfolioPct: region.percentage ?? 0,
      color: colorForIndex(index + 2),
    })),
  );
}

export function getProductMix(): Promise<ProductMix[]> {
  return apiGet<BackendProductMix[]>('/api/v1/reports/loans/product-mix').then((products) =>
    products.map((product, index) => ({
      product: product.productName,
      count: product.count ?? 0,
      amount: product.amount ?? 0,
      nplPct: product.nplPct ?? 0,
      avgRate: product.avgRate ?? 0,
      avgTenorMonths: product.avgTenorMonths ?? 0,
      color: colorForIndex(index),
    })),
  );
}

export function getVintageData(): Promise<VintageCell[]> {
  return apiGet<VintageCell[]>('/api/v1/reports/loans/vintage-matrix');
}

export function getNplTrend(): Promise<NplTrendPoint[]> {
  return apiGet<NplTrendPoint[]>('/api/v1/reports/loans/npl-trend');
}

export function getProvisionWaterfall(): Promise<ProvisionWaterfallItem[]> {
  return apiGet<BackendProvisionWaterfall>('/api/v1/reports/loans/provision-waterfall').then((waterfall) => ([
    { name: 'Opening', value: waterfall.opening ?? 0, type: 'opening' },
    { name: 'Charge', value: waterfall.charge ?? 0, type: 'add' },
    { name: 'Release', value: -(waterfall.release ?? 0), type: 'reduce' },
    { name: 'Write-off', value: -(waterfall.writeOff ?? 0), type: 'reduce' },
    { name: 'Closing', value: waterfall.closing ?? 0, type: 'closing' },
  ]));
}

export function getTopObligors(): Promise<TopObligor[]> {
  return apiGet<BackendTopObligor[]>('/api/v1/reports/loans/top-obligors').then((obligors) =>
    obligors.map((obligor, index) => ({
      rank: index + 1,
      name: obligor.customerName,
      sector: obligor.sector ?? 'UNKNOWN',
      exposure: obligor.exposure ?? 0,
      portfolioPct: obligor.percentage ?? 0,
      classification: classifyBucket(obligor.delinquencyBucket),
    })),
  );
}
