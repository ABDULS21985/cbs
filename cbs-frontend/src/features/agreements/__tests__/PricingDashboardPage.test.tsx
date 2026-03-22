import { describe, it, expect } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { PricingDashboardPage } from '../pages/PricingDashboardPage';
import { createMockDiscountScheme, createMockSpecialPricing } from '@/test/factories/agreementFactory';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockSchemes = [
  createMockDiscountScheme({ id: 1, schemeCode: 'DS-001', schemeName: 'Volume Discount', status: 'ACTIVE', currentUtilization: 250000, maxTotalBudget: 1000000 }),
  createMockDiscountScheme({ id: 2, schemeCode: 'DS-002', schemeName: 'Loyalty Discount', status: 'DRAFT', currentUtilization: 0 }),
  createMockDiscountScheme({ id: 3, schemeCode: 'DS-003', schemeName: 'Staff Discount', status: 'ACTIVE', currentUtilization: 500000, maxTotalBudget: 500000 }),
];

const mockSpecialPricing = [
  createMockSpecialPricing({ id: 1, agreementCode: 'SPA-001', customerName: 'Acme Corp', status: 'ACTIVE', nextReviewDate: '2024-01-01' }),
  createMockSpecialPricing({ id: 2, agreementCode: 'SPA-002', customerName: 'Beta Inc', status: 'ACTIVE', nextReviewDate: '2028-06-01' }),
];

function setupHandlers() {
  server.use(
    http.get('/api/v1/pricing/discounts', () => HttpResponse.json(wrap(mockSchemes))),
    http.get('/api/v1/pricing/discounts/active', () =>
      HttpResponse.json(wrap(mockSchemes.filter((s) => s.status === 'ACTIVE'))),
    ),
    http.get('/api/v1/pricing/discounts/utilization', () =>
      HttpResponse.json(wrap(mockSchemes.filter((s) => s.status === 'ACTIVE'))),
    ),
    http.get('/api/v1/pricing/special-pricing', () => HttpResponse.json(wrap(mockSpecialPricing))),
    http.post('/api/v1/pricing/discounts', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(wrap(createMockDiscountScheme(body)), { status: 201 });
    }),
    http.post('/api/v1/pricing/special-pricing', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json(wrap(createMockSpecialPricing(body)), { status: 201 });
    }),
    http.put('/api/v1/pricing/special-pricing/:id/review', () =>
      HttpResponse.json(wrap(createMockSpecialPricing({ status: 'UNDER_REVIEW' }))),
    ),
    http.post('/api/v1/pricing/discounts/evaluate', () =>
      HttpResponse.json(wrap({
        schemeName: 'Volume Discount',
        schemeCode: 'DS-001',
        schemeType: 'VOLUME_BASED',
        discountBasis: 'PERCENTAGE_OFF',
        discountValue: 10,
      })),
    ),
  );
}

describe('PricingDashboardPage', () => {
  it('renders page header', () => {
    setupHandlers();
    renderWithProviders(<PricingDashboardPage />);
    expect(screen.getByText('Pricing & Discounts')).toBeInTheDocument();
  });

  it('shows three tabs', () => {
    setupHandlers();
    renderWithProviders(<PricingDashboardPage />);
    expect(screen.getByText('Discount Schemes')).toBeInTheDocument();
    expect(screen.getByText('Special Pricing Agreements')).toBeInTheDocument();
    expect(screen.getByText('Discount Evaluation Tool')).toBeInTheDocument();
  });

  it('displays discount schemes in table', async () => {
    setupHandlers();
    renderWithProviders(<PricingDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('DS-001')).toBeInTheDocument();
      expect(screen.getByText('Volume Discount')).toBeInTheDocument();
    });
  });

  it('shows stat cards for discounts', async () => {
    setupHandlers();
    renderWithProviders(<PricingDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Schemes')).toBeInTheDocument();
    });
  });

  it('shows New Discount Scheme button on discounts tab', () => {
    setupHandlers();
    renderWithProviders(<PricingDashboardPage />);
    expect(screen.getByText('New Discount Scheme')).toBeInTheDocument();
  });

  it('switches to special pricing tab', async () => {
    setupHandlers();
    renderWithProviders(<PricingDashboardPage />);
    fireEvent.click(screen.getByText('Special Pricing Agreements'));
    await waitFor(() => {
      expect(screen.getByText('SPA-001')).toBeInTheDocument();
      expect(screen.getByText('SPA-002')).toBeInTheDocument();
    });
  });

  it('shows overdue reviews warning on special pricing tab', async () => {
    setupHandlers();
    renderWithProviders(<PricingDashboardPage />);
    fireEvent.click(screen.getByText('Special Pricing Agreements'));
    await waitFor(() => {
      expect(screen.getByText(/Overdue Reviews/)).toBeInTheDocument();
    });
  });

  it('shows Review button for ACTIVE special pricing', async () => {
    setupHandlers();
    renderWithProviders(<PricingDashboardPage />);
    fireEvent.click(screen.getByText('Special Pricing Agreements'));
    await waitFor(() => {
      const reviewButtons = screen.getAllByText('Review');
      expect(reviewButtons.length).toBeGreaterThan(0);
    });
  });

  it('switches to evaluation tool tab', async () => {
    setupHandlers();
    renderWithProviders(<PricingDashboardPage />);
    fireEvent.click(screen.getByText('Discount Evaluation Tool'));
    await waitFor(() => {
      expect(screen.getByText('Test Discount Eligibility')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g. 1001')).toBeInTheDocument();
    });
  });

  it('opens create discount dialog', async () => {
    setupHandlers();
    renderWithProviders(<PricingDashboardPage />);
    fireEvent.click(screen.getByText('New Discount Scheme'));
    await waitFor(() => {
      expect(screen.getByText('Scheme Name *')).toBeInTheDocument();
    });
  });

  it('opens create special pricing dialog', async () => {
    setupHandlers();
    renderWithProviders(<PricingDashboardPage />);
    fireEvent.click(screen.getByText('Special Pricing Agreements'));
    await waitFor(() => {
      expect(screen.getByText('New Special Pricing')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('New Special Pricing'));
    await waitFor(() => {
      expect(screen.getByText('New Special Pricing Agreement')).toBeInTheDocument();
    });
  });
});
