/**
 * API for market analysis and research projects.
 */
import { apiGet, apiPost } from '@/lib/api';
import type {
  MarketAnalysisReport,
  MarketAnalysis,
  AnalysisType,
  MarketResearchProject,
  ResearchProjectType,
} from '../types';

// ─── Market Analysis ─────────────────────────────────────────────────────────

export const getPublished = (params?: Record<string, unknown>) =>
  apiGet<MarketAnalysisReport[]>('/api/v1/market-analysis/published', params);

export const getAnalysisByType = (type: AnalysisType) =>
  apiGet<MarketAnalysis[]>(`/api/v1/market-analysis/type/${type}`);

export const createAnalysis = (input: {
  title: string;
  type: AnalysisType;
  instrument?: string;
  sector?: string;
  summary: string;
}) => apiPost<MarketAnalysis>('/api/v1/market-analysis', input);

export const publishAnalysis = (code: string) =>
  apiPost<MarketAnalysis>(`/api/v1/market-analysis/${code}/publish`);

// ─── Market Research Projects ────────────────────────────────────────────────

export const getActiveResearchProjects = () =>
  apiGet<MarketResearchProject[]>('/api/v1/market-research/active');

export const getResearchLibrary = (type?: ResearchProjectType) =>
  apiGet<MarketResearchProject[]>('/api/v1/market-research/library', type ? { type } : undefined);

export const getResearchInsights = () =>
  apiGet<{
    totalProjects: number;
    completedThisMonth: number;
    keyThemes: string[];
    recommendations: string[];
  }>('/api/v1/market-research/insights');

export const createResearchProject = (input: {
  title: string;
  type: ResearchProjectType;
  description: string;
}) => apiPost<MarketResearchProject>('/api/v1/market-research', input);

export const completeResearchProject = (
  code: string,
  input: { findings: string; keyInsights: string[]; actionItems: string[] },
) => apiPost<MarketResearchProject>(`/api/v1/market-research/${code}/complete`, input);

export const trackResearchActions = (code: string, data: Record<string, unknown>) =>
  apiPost<MarketResearchProject>(`/api/v1/market-research/${code}/actions`, data);
