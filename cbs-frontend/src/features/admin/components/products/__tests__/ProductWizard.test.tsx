import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { ProductWizard } from '../ProductWizard';

describe('ProductWizard', () => {
  it('adds a Shariah configuration step for Islamic products', () => {
    renderWithProviders(
      <ProductWizard
        onComplete={vi.fn()}
        onCancel={vi.fn()}
        initialData={{
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
        }}
      />, 
    );

    expect(screen.getByText('Shariah Configuration')).toBeInTheDocument();
  });
});