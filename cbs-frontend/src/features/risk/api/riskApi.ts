import api from '@/lib/api';
import type { ApiResponse } from '@/types/common';
import type { RiskAppetite, RiskHeatmapCell, KriIndicator, RiskAlert, RiskLimit } from '../types/dashboard';

export const riskApi = {
  getRiskAppetite: () => api.get<ApiResponse<RiskAppetite[]>>('/api/v1/risk/appetite'),
  getHeatmap: () => api.get<ApiResponse<RiskHeatmapCell[]>>('/api/v1/risk/heatmap'),
  getKris: () => api.get<ApiResponse<KriIndicator[]>>('/api/v1/risk/kris'),
  getAlerts: () => api.get<ApiResponse<RiskAlert[]>>('/api/v1/risk/alerts'),
  getLimits: () => api.get<ApiResponse<RiskLimit[]>>('/api/v1/risk/limits'),
};
