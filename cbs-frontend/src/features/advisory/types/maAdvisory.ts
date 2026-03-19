// Auto-generated from backend entities

export interface MaEngagement {
  id: number;
  engagementCode: string;
  engagementName: string;
  engagementType: string;
  clientName: string;
  clientCustomerId: number;
  clientSector: string;
  targetName: string;
  targetSector: string;
  targetCountry: string;
  transactionCurrency: string;
  estimatedDealValue: number;
  actualDealValue: number;
  dealStructure: string;
  ourRole: string;
  leadBanker: string;
  teamMembers: Record<string, unknown>;
  retainerFee: number;
  retainerFrequency: string;
  successFeePct: number;
  successFeeMin: number;
  successFeeCap: number;
  expenseReimbursement: boolean;
  totalFeesEarned: number;
  mandateDate: string;
  informationMemoDate: string;
  dataRoomOpenDate: string;
  indicativeBidDeadline: string;
  dueDiligenceStart: string;
  dueDiligenceEnd: string;
  bindingBidDeadline: string;
  signingDate: string;
  regulatoryApprovalDate: string;
  closingDate: string;
  competingBidders: number;
  confidentialityAgreements: Record<string, unknown>;
  regulatoryApprovals: Record<string, unknown>;
  status: string;
}

