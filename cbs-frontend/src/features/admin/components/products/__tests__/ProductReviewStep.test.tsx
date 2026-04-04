import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { ProductReviewStep } from '../ProductReviewStep';
import type { BankingProduct } from '../../../api/productApi';

function createProduct(): Partial<BankingProduct> {
  return {
    code: 'MRB-HOME-001',
    name: 'Home Murabaha Finance',
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
    islamicConfig: {
      nameAr: 'تمويل المرابحة السكني',
      contractTypeCode: 'MURABAHA',
      contractTypeName: 'Murabaha - Cost-Plus Sale',
      productCategory: 'FINANCING',
      profitCalculationMethod: 'COST_PLUS_MARKUP',
      markupRate: 3.5,
      fatwaRequired: true,
      fatwaId: 42,
      shariahRuleGroupCode: 'MURABAHA',
    },
  };
}

describe('ProductReviewStep', () => {
  it('renders Islamic product summary and submit label for Islamic products', () => {
    renderWithProviders(
      <ProductReviewStep product={createProduct()} onSaveDraft={vi.fn()} onPublish={vi.fn()} />,
    );

    expect(screen.getByText('Shariah Configuration')).toBeInTheDocument();
    expect(screen.getByText('Murabaha - Cost-Plus Sale')).toBeInTheDocument();
    expect(screen.getByText('Cost + 3.5% markup')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create & submit/i })).toBeInTheDocument();
  });
});