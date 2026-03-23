import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { ProductCatalogPage } from './ProductCatalogPage';

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

const mockProducts = [
  {
    id: 1,
    code: 'SA-STD',
    name: 'Standard Savings',
    description: 'Everyday savings product for retail customers.',
    productCategory: 'SAVINGS',
    currencyCode: 'NGN',
    minOpeningBalance: 5000,
    minOperatingBalance: 5000,
    maxBalance: 10000000,
    baseInterestRate: 3.5,
    monthlyMaintenanceFee: 0,
    smsAlertFee: 4,
    allowsDebitCard: true,
    allowsChequeBook: false,
    allowsMobile: true,
    allowsInternet: true,
    allowsOverdraft: false,
    allowsSweep: false,
    dormancyDays: 365,
    isActive: true,
    interestTiers: [
      { id: 1, tierName: 'Tier 1', minBalance: 5000, maxBalance: 500000, interestRate: 3.5, isActive: true },
    ],
  },
  {
    id: 2,
    code: 'CA-BIZ',
    name: 'Business Current Account',
    description: 'Current account tailored for operating businesses.',
    productCategory: 'CURRENT',
    currencyCode: 'NGN',
    minOpeningBalance: 50000,
    minOperatingBalance: 50000,
    maxBalance: null,
    baseInterestRate: 0,
    monthlyMaintenanceFee: 2500,
    smsAlertFee: 4,
    allowsDebitCard: true,
    allowsChequeBook: true,
    allowsMobile: true,
    allowsInternet: true,
    allowsOverdraft: true,
    maxOverdraftLimit: 5000000,
    allowsSweep: false,
    dormancyDays: 180,
    isActive: true,
    interestTiers: [],
  },
  {
    id: 3,
    code: 'FD-180',
    name: '180-Day Fixed Deposit',
    description: 'Fixed tenor placement account for medium-term deposits.',
    productCategory: 'FIXED_DEPOSIT',
    currencyCode: 'NGN',
    minOpeningBalance: 100000,
    minOperatingBalance: 100000,
    maxBalance: null,
    baseInterestRate: 12.5,
    monthlyMaintenanceFee: 0,
    smsAlertFee: 0,
    allowsDebitCard: false,
    allowsChequeBook: false,
    allowsMobile: false,
    allowsInternet: false,
    allowsOverdraft: false,
    allowsSweep: false,
    dormancyDays: 30,
    isActive: true,
    interestTiers: [],
  },
];

function setupHandlers(products = mockProducts) {
  server.use(
    http.get('/api/v1/accounts/products', () => HttpResponse.json(wrap(products))),
    http.get('/api/v1/accounts/products/category/:category', ({ params }) => {
      const category = String(params.category);
      return HttpResponse.json(wrap(products.filter((product) => product.productCategory === category)));
    }),
    http.get('/api/v1/accounts/products/:code', ({ params }) => {
      const product = products.find((entry) => entry.code === params.code);
      return HttpResponse.json(wrap(product ?? products[0]));
    }),
  );
}

describe('ProductCatalogPage', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  it('renders the page title', () => {
    setupHandlers();
    renderWithProviders(<ProductCatalogPage />);
    expect(screen.getByText('Account Products')).toBeInTheDocument();
  });

  it('shows product cards after loading', async () => {
    setupHandlers();
    renderWithProviders(<ProductCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('Standard Savings')).toBeInTheDocument();
    });

    expect(screen.getByText('Business Current Account')).toBeInTheDocument();
    expect(screen.getByText('180-Day Fixed Deposit')).toBeInTheDocument();
  });

  it('derives category filters from the live product feed', async () => {
    setupHandlers();
    renderWithProviders(<ProductCatalogPage />);

    const categoryNav = screen.getByRole('navigation', { name: /product categories/i });

    await waitFor(() => {
      expect(screen.getByText('Standard Savings')).toBeInTheDocument();
    });

    expect(within(categoryNav).getByRole('button', { name: /all products/i })).toBeInTheDocument();
    expect(within(categoryNav).getByRole('button', { name: /savings/i })).toBeInTheDocument();
    expect(within(categoryNav).getByRole('button', { name: /current/i })).toBeInTheDocument();
    expect(within(categoryNav).getByRole('button', { name: /fixed deposit/i })).toBeInTheDocument();
  });

  it('filters by category when a category button is clicked', async () => {
    setupHandlers();
    renderWithProviders(<ProductCatalogPage />);

    const categoryNav = screen.getByRole('navigation', { name: /product categories/i });

    await waitFor(() => {
      expect(screen.getByText('Standard Savings')).toBeInTheDocument();
    });

    fireEvent.click(within(categoryNav).getByRole('button', { name: /current/i }));

    await waitFor(() => {
      expect(screen.getByText('Business Current Account')).toBeInTheDocument();
    });

    expect(screen.queryByText('Standard Savings')).not.toBeInTheDocument();
    expect(screen.queryByText('180-Day Fixed Deposit')).not.toBeInTheDocument();
  });

  it('supports search filtering', async () => {
    setupHandlers();
    renderWithProviders(<ProductCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('Standard Savings')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search by code, name, category, or currency'), {
      target: { value: 'Business' },
    });

    await waitFor(() => {
      expect(screen.getByText('Business Current Account')).toBeInTheDocument();
    });

    expect(screen.queryByText('Standard Savings')).not.toBeInTheDocument();
    expect(screen.queryByText('180-Day Fixed Deposit')).not.toBeInTheDocument();
  });

  it('shows loading skeletons while loading', () => {
    server.use(
      http.get('/api/v1/accounts/products', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return HttpResponse.json(wrap([]));
      }),
    );

    renderWithProviders(<ProductCatalogPage />);

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no products match', async () => {
    setupHandlers([]);
    renderWithProviders(<ProductCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('No products match this view')).toBeInTheDocument();
    });
  });

  it('expands product details and shows live detail fields', async () => {
    setupHandlers();
    renderWithProviders(<ProductCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('Standard Savings')).toBeInTheDocument();
    });

    const savingsCard = screen.getByText('Standard Savings').closest('article');
    expect(savingsCard).not.toBeNull();

    fireEvent.click(within(savingsCard as HTMLElement).getByRole('button', { name: /view details/i }));

    await waitFor(() => {
      expect(within(savingsCard as HTMLElement).getByText('Operating Balance')).toBeInTheDocument();
    });

    expect(within(savingsCard as HTMLElement).getByText('SMS Alert Fee')).toBeInTheDocument();
    expect(within(savingsCard as HTMLElement).getByText('Interest Tiers')).toBeInTheDocument();
    expect(within(savingsCard as HTMLElement).getByText('Tier 1')).toBeInTheDocument();
  });

  it('shows capability chips on product cards', async () => {
    setupHandlers();
    renderWithProviders(<ProductCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('Business Current Account')).toBeInTheDocument();
    });

    const businessCard = screen.getByText('Business Current Account').closest('article');
    expect(businessCard).not.toBeNull();

    expect(within(businessCard as HTMLElement).getByText('Cheque book')).toBeInTheDocument();
    expect(within(businessCard as HTMLElement).getByText('Debit card')).toBeInTheDocument();
    expect(within(businessCard as HTMLElement).getByText('Internet banking')).toBeInTheDocument();
  });

  it('navigates to account opening with the selected product code', async () => {
    setupHandlers();
    renderWithProviders(
      <Routes>
        <Route path="/accounts/products" element={<ProductCatalogPage />} />
        <Route path="/accounts/open" element={<div>Open Workflow</div>} />
      </Routes>,
      { route: '/accounts/products' },
    );

    await waitFor(() => {
      expect(screen.getByText('Standard Savings')).toBeInTheDocument();
    });

    const savingsCard = screen.getByText('Standard Savings').closest('article');
    expect(savingsCard).not.toBeNull();

    fireEvent.click(within(savingsCard as HTMLElement).getByRole('button', { name: /open with product/i }));

    await waitFor(() => {
      expect(screen.getByText('Open Workflow')).toBeInTheDocument();
    });
  });
});
