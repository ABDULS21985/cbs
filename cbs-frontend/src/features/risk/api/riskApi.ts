import api from '@/lib/api';
import type { ApiResponse } from '@/types/common';
import type { RiskAppetite, RiskHeatmapCell, KriIndicator, RiskAlert, RiskLimit } from '../types/dashboard';

export const riskApi = {
  getRiskAppetite: () => api.get<ApiResponse<RiskAppetite[]>>('/v1/risk/appetite'),
  getHeatmap: () => api.get<ApiResponse<RiskHeatmapCell[]>>('/v1/risk/heatmap'),
  getKris: () => api.get<ApiResponse<KriIndicator[]>>('/v1/risk/kris'),
  getAlerts: () => api.get<ApiResponse<RiskAlert[]>>('/v1/risk/alerts'),
  getLimits: () => api.get<ApiResponse<RiskLimit[]>>('/v1/risk/limits'),
};
