// Auto-generated from backend entities

export interface MarketResearchProject {
  id: number;
  projectCode: string;
  projectName: string;
  projectType: string;
  objectives: string;
  methodology: string;
  targetPopulation: string;
  sampleSize: number;
  vendor: string;
  projectLead: string;
  budget: number;
  actualCost: number;
  plannedStartDate: string;
  plannedEndDate: string;
  actualEndDate: string;
  keyFindings: Record<string, unknown>;
  recommendations: Record<string, unknown>;
  actionsTaken: Record<string, unknown>;
  impactMeasurement: Record<string, unknown>;
  status: string;
}

