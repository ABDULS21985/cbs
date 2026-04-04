import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductTable } from '../ProductTable';
import type { BankingProduct } from '../../../api/productApi';

const product: BankingProduct = {
  id: '101',
  code: 'MRB-HOME-001',
  name: 'Home Murabaha Finance',
  shortDescription: 'Asset-backed financing',
  longDescription: 'Shariah compliant home finance product',
  type: 'LOAN',
  category: 'ISLAMIC',
  currency: 'NGN',
  interestType: 'NONE',
  linkedFees: [],
  eligibility: {
    customerType: 'INDIVIDUAL',
    kycLevel: 2,
    minimumOpeningBalance: 500000,
    segment: 'PREMIUM',
    existingProductRequired: null,
    geographicScope: 'ALL',
  },
  limits: {
    dailyDebitLimit: 1000000,
    dailyCreditLimit: 5000000,
    perTransactionLimit: 500000,
    atmLimit: 0,
    posLimit: 0,
    onlineLimit: 500000,
    maxBalance: 100000000,
    minimumBalance: 0,
    overdraftAllowed: false,
    dormancyDays: 180,
    dormancyFee: 0,
    channels: ['Branch', 'Web'],
  },
  status: 'ACTIVE',
  version: 1,
  activeAccounts: 12,
  totalBalance: 12000000,
  revenueMTD: 750000,
  createdAt: '2026-04-04T00:00:00Z',
  updatedAt: '2026-04-04T00:00:00Z',
};

describe('ProductTable', () => {
  it('shows Shariah compliance column when Islamic metadata is present', () => {
    render(
      <ProductTable
        products={[product]}
        islamicByCode={{
          'MRB-HOME-001': {
            id: 77,
            productCode: 'MRB-HOME-001',
            name: 'Home Murabaha Finance',
            nameAr: 'تمويل المرابحة السكني',
            contractTypeId: 1,
            contractTypeCode: 'MURABAHA',
            contractTypeName: 'Murabaha - Cost-Plus Sale',
            productCategory: 'FINANCING',
            profitCalculationMethod: 'COST_PLUS_MARKUP',
            shariahComplianceStatus: 'COMPLIANT',
            status: 'ACTIVE',
            productVersion: 2,
            hasActiveFatwa: true,
            active: true,
            activeContractCount: 0,
            applicableShariahRules: [],
            currencies: ['NGN'],
            eligibleCustomerTypes: ['INDIVIDUAL'],
            eligibleSegments: ['PREMIUM'],
            eligibleCountries: ['NG'],
            fatwaReference: 'FTW-2026-0042',
          },
        }}
        onRowClick={vi.fn()}
      />,
    );

    expect(screen.getByText('Shariah')).toBeInTheDocument();
    expect(screen.getByText('COMPLIANT')).toBeInTheDocument();
    expect(screen.getByText('FTW-2026-0042')).toBeInTheDocument();
  });
});