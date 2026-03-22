// Auto-generated from backend entities

import type { Customer } from '@/features/customers/types/customer';

export interface DocumentaryCollection {
  id: number;
  collectionNumber: string;
  collectionType: string;
  collectionRole: string;
  drawer: Customer;
  draweeName: string;
  draweeAddress: string;
  remittingBankCode: string;
  collectingBankCode: string;
  amount: number;
  currencyCode: string;
  documentsList: string[];
  tenorDays: number;
  maturityDate: string;
  acceptanceDate: string;
  protestInstructions: string;
  status: string;
  paidAmount: number;
  paidDate: string;
}

