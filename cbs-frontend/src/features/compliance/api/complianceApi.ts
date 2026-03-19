import { apiGet, apiPost } from '@/lib/api';

export interface ComplianceStats {
  activeAssessments: number;
  openGaps: number;
  criticalGaps: number;
  overdueRemediations: number;
  complianceScore: number;
}

export interface Assessment {
  id: number;
  name: string;
  regulatorySource: string;
  period: string;
  controlsAssessed: number;
  compliantCount: number;
  partiallyCompliantCount: number;
  nonCompliantCount: number;
  complianceScore: number;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED';
  createdAt: string;
}

export interface ComplianceGap {
  id: number;
  analysisCode: string;
  assessmentName: string;
  requirementRef: string;
  requirementDescription: string;
  gapSeverity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'OBSERVATION';
  gapCategory: 'POLICY' | 'PROCESS' | 'TECHNOLOGY' | 'PEOPLE' | 'DATA' | 'DOCUMENTATION';
  remediationOwner: string;
  remediationTargetDate: string;
  remediationActualDate?: string;
  ageDays: number;
  status: 'IDENTIFIED' | 'REMEDIATION_PLANNED' | 'IN_PROGRESS' | 'REMEDIATED' | 'VERIFIED' | 'ACCEPTED_RISK';
}

export interface PolicyDocument {
  id: number;
  title: string;
  category: string;
  version: string;
  approvalDate: string;
  nextReviewDate: string;
  owner: string;
  status: 'DRAFT' | 'APPROVED' | 'ARCHIVED';
}

export interface AuditFinding {
  id: number;
  findingRef: string;
  auditName: string;
  finding: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  owner: string;
  targetDate: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'OVERDUE';
}

export const complianceApi = {
  getStats: () => apiGet<ComplianceStats>('/api/v1/compliance/stats'),
  getAssessments: () => apiGet<Assessment[]>('/api/v1/compliance/assessments'),
  getAssessment: (id: number) => apiGet<Assessment>(`/api/v1/compliance/assessments/${id}`),
  getGaps: (filters?: Record<string, unknown>) => apiGet<ComplianceGap[]>('/api/v1/compliance/gaps', filters),
  updateGapStatus: (id: number, status: string) => apiPost<ComplianceGap>(`/api/v1/compliance/gaps/${id}/status`, { status }),
  getPolicies: () => apiGet<PolicyDocument[]>('/api/v1/compliance/policies'),
  getAuditFindings: (filters?: Record<string, unknown>) => apiGet<AuditFinding[]>('/api/v1/compliance/audit-findings', filters),
};
