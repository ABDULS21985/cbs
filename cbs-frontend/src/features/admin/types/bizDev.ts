// Auto-generated from backend entities

export interface BizDevInitiative {
  id: number;
  initiativeCode: string;
  initiativeName: string;
  initiativeType: string;
  description: string;
  sponsor: string;
  leadOwner: string;
  targetSegment: string;
  targetRegion: string;
  estimatedRevenue: number;
  estimatedCost: number;
  actualRevenue: number;
  actualCost: number;
  roiTargetPct: number;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
  milestones: Record<string, unknown>[];
  progressPct: number;
  kpis: Record<string, unknown>;
  risks: Record<string, unknown>[];
  status: string;
}

