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

// ─── MarketAnalysisReport → MarketAnalysis mapper ────────────────────────────

/**
 * The backend MarketAnalysisReport entity uses different field names than
 * the frontend MarketAnalysis domain type:
 *   backend: reportName, analysisType, executiveSummary, reportCode
 *   frontend: title,     type,         summary,          code
 */
function mapReport(raw: MarketAnalysisReport): MarketAnalysis {
  return {
    id: raw.id,
    code: raw.reportCode,
    title: raw.reportName,
    type: (raw.analysisType ?? 'TECHNICAL') as AnalysisType,
    sector: (raw.region !== 'NIGERIA' ? raw.region : undefined) ?? undefined,
    summary: raw.executiveSummary,
    status: (raw.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT') as MarketAnalysis['status'],
    publishedAt: raw.publishedAt ?? undefined,
    createdAt: raw.analysisDate ?? '',
  };
}

// ─── Market Analysis ─────────────────────────────────────────────────────────

export const getPublished = async (params?: Record<string, unknown>): Promise<MarketAnalysis[]> => {
  const raw = await apiGet<MarketAnalysisReport[]>('/api/v1/market-analysis/published', params);
  return raw.map(mapReport);
};

export const getAnalysisByType = async (type: AnalysisType): Promise<MarketAnalysis[]> => {
  const raw = await apiGet<MarketAnalysisReport[]>(`/api/v1/market-analysis/type/${type}`);
  return raw.map(mapReport);
};

export const getAll = async (): Promise<MarketAnalysis[]> => {
  const raw = await apiGet<MarketAnalysisReport[]>('/api/v1/market-analysis');
  return raw.map(mapReport);
};

export const createAnalysis = async (input: {
  title: string;
  type: AnalysisType;
  instrument?: string;
  sector?: string;
  summary: string;
}): Promise<MarketAnalysis> => {
  // Remap frontend field names to backend entity field names.
  // instrument is stored in executiveSummary prefix (no dedicated column on entity);
  // sector maps to the region field when it's not a geography.
  const payload = {
    reportName: input.title,
    analysisType: input.type,
    executiveSummary: input.summary,
    region: input.sector || 'NIGERIA',
    analysisDate: new Date().toISOString().split('T')[0],
  };
  const raw = await apiPost<MarketAnalysisReport>('/api/v1/market-analysis', payload);
  return mapReport(raw);
};

export const publishAnalysis = async (code: string): Promise<MarketAnalysis> => {
  const raw = await apiPost<MarketAnalysisReport>(`/api/v1/market-analysis/${code}/publish`);
  return mapReport(raw);
};

// ─── Market Research Projects ────────────────────────────────────────────────

/**
 * Backend entity field names differ from the frontend domain type:
 *   backend: projectCode, projectType
 *   frontend: code,       type
 */
interface BackendResearchProject {
  id: number;
  projectCode: string;
  title: string;
  projectType: string;
  description: string;
  status: string;
  findings?: string;
  keyInsights?: string[];
  actionItems?: string[];
  completedAt?: string;
  createdAt: string;
}

function mapResearchProject(raw: BackendResearchProject): MarketResearchProject {
  return {
    id: raw.id,
    code: raw.projectCode,
    title: raw.title,
    type: raw.projectType as ResearchProjectType,
    description: raw.description,
    status: (raw.status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE') as MarketResearchProject['status'],
    findings: raw.findings,
    keyInsights: raw.keyInsights,
    actionItems: raw.actionItems,
    completedAt: raw.completedAt,
    createdAt: raw.createdAt,
  };
}

export const getActiveResearchProjects = async (): Promise<MarketResearchProject[]> => {
  const raw = await apiGet<BackendResearchProject[]>('/api/v1/market-research/active');
  return raw.map(mapResearchProject);
};

export const getResearchLibrary = async (type?: ResearchProjectType): Promise<MarketResearchProject[]> => {
  const raw = await apiGet<BackendResearchProject[]>('/api/v1/market-research/library', type ? { type } : undefined);
  return raw.map(mapResearchProject);
};

export const getResearchInsights = () =>
  apiGet<{
    totalProjects: number;
    completedThisMonth: number;
    keyThemes: string[];
    recommendations: string[];
  }>('/api/v1/market-research/insights');

export const createResearchProject = async (input: {
  title: string;
  type: ResearchProjectType;
  description: string;
}): Promise<MarketResearchProject> => {
  const raw = await apiPost<BackendResearchProject>('/api/v1/market-research', {
    title: input.title,
    projectType: input.type,
    description: input.description,
  });
  return mapResearchProject(raw);
};

export const completeResearchProject = async (
  code: string,
  input: { findings: string; keyInsights: string[]; actionItems: string[] },
): Promise<MarketResearchProject> => {
  const raw = await apiPost<BackendResearchProject>(`/api/v1/market-research/${code}/complete`, input);
  return mapResearchProject(raw);
};

export const trackResearchActions = async (code: string, data: Record<string, unknown>): Promise<MarketResearchProject> => {
  const raw = await apiPost<BackendResearchProject>(`/api/v1/market-research/${code}/actions`, data);
  return mapResearchProject(raw);
};
