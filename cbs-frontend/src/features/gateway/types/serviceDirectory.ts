// Auto-generated from backend entities

export interface ServiceDirectoryEntry {
  id: number;
  serviceCode: string;
  serviceName: string;
  serviceCategory: string;
  description: string;
  availableChannels: string[];
  eligibilityRules: Record<string, unknown>;
  requiresAppointment: boolean;
  slaMinutes: number;
  feeApplicable: boolean;
  feeAmount: number;
  documentationUrl: string;
  isActive: boolean;
  createdAt: string;
}

