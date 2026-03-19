// Auto-generated from backend entities

export interface InterbankRelationship {
  id: number;
  relationshipCode: string;
  counterpartyBankId: number;
  bankName: string;
  bicCode: string;
  relationshipType: string;
  creditLineAmount: number;
  creditLineUsed: number;
  agreementDate: string;
  reviewDate: string;
  status: string;
}

