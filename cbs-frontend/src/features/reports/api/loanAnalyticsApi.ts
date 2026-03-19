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

export interface SectorExposure {
  sector: string;
  amount: number;
  portfolioPct: number;
  nplPct: number;
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

// ─── API Functions ─────────────────────────────────────────────────────────────

export function getLoanPortfolioStats(): Promise<LoanPortfolioStats> {
  return apiGet<LoanPortfolioStats>('/api/v1/reports/loans/stats');
}

export function getDpdBuckets(): Promise<DpdBucket[]> {
  return apiGet<DpdBucket[]>('/api/v1/reports/loans/dpd-buckets');
}

export function getSectorExposure(): Promise<SectorExposure[]> {
  return apiGet<SectorExposure[]>('/api/v1/reports/loans/sector-exposure');
}

export function getProductMix(): Promise<ProductMix[]> {
  return apiGet<ProductMix[]>('/api/v1/reports/loans/product-mix');
}

export function getVintageData(): Promise<VintageCell[]> {
  return apiGet<VintageCell[]>('/api/v1/reports/loans/vintage');
}

export function getNplTrend(): Promise<NplTrendPoint[]> {
  return apiGet<NplTrendPoint[]>('/api/v1/reports/loans/npl-trend');
}

export function getProvisionWaterfall(): Promise<ProvisionWaterfallItem[]> {
  return apiGet<ProvisionWaterfallItem[]>('/api/v1/reports/loans/provision-waterfall');
}

export function getTopObligors(): Promise<TopObligor[]> {
  return apiGet<TopObligor[]>('/api/v1/reports/loans/top-obligors');
}
