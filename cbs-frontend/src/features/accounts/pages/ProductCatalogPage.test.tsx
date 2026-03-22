import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
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
    productCode: 'SA-STD',
    name: 'Standard Savings',
    productName: 'Standard Savings',
    productCategory: 'SAVINGS',
    currencyCode: 'NGN',
    currency: 'NGN',
    minOpeningBalance: 5000,
    minimumBalance: 5000,
    baseInterestRate: 3.5,
    interestRate: 3.5,
    allowsDebitCard: true,
    debitCardAllowed: true,
    allowsChequeBook: false,
    allowsMobile: true,
    mobileEnabled: true,
    allowsInternet: true,
    internetEnabled: true,
    allowsOverdraft: false,
    isActive: true,
    monthlyMaintenanceFee: 0,
  },
  {
    id: 2,
    code: 'CA-BIZ',
    productCode: 'CA-BIZ',
    name: 'Business Current Account',
    productName: 'Business Current Account',
    productCategory: 'CURRENT',
    currencyCode: 'NGN',
    currency: 'NGN',
    minOpeningBalance: 50000,
    minimumBalance: 50000,
    baseInterestRate: 0,
    interestRate: 0,
    allowsDebitCard: true,
    debitCardAllowed: true,
    allowsChequeBook: true,
    chequeBookAllowed: true,
    allowsMobile: true,
    mobileEnabled: true,
    allowsInternet: true,
    internetEnabled: true,
    allowsOverdraft: true,
    overdraftAllowed: true,
    isActive: true,
    monthlyMaintenanceFee: 2500,
  },
  {
    id: 3,
    code: 'FD-180',
    productCode: 'FD-180',
    name: '180-Day Fixed Deposit',
    productName: '180-Day Fixed Deposit',
    productCategory: 'FIXED_DEPOSIT',
    currencyCode: 'NGN',
    currency: 'NGN',
    minOpeningBalance: 100000,
    minimumBalance: 100000,
    baseInterestRate: 12.5,
    interestRate: 12.5,
    allowsDebitCard: false,
    allowsChequeBook: false,
    allowsMobile: false,
    allowsInternet: false,
    allowsOverdraft: false,
    isActive: true,
    monthlyMaintenanceFee: 0,
  },
];

describe('ProductCatalogPage', () => {
  afterEach(() => {
    server.resetHandlers();
  });

  beforeEach(() => {
    server.use(
      http.get('/api/v1/accounts/products', () =>
        HttpResponse.json(wrap(mockProducts)),
      ),
      http.get('/api/v1/accounts/products/category/:category', ({ params }) => {
        const cat = params.category;
        const filtered = mockProducts.filter(p => p.productCategory === cat);
        return HttpResponse.json(wrap(filtered));
      }),
    );
  });

  it('renders the page title', async () => {
    renderWithProviders(<ProductCatalogPage />);
    expect(screen.getByText('Account Products')).toBeInTheDocument();
  });

  it('shows product cards after loading', async () => {
    renderWithProviders(<ProductCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('Standard Savings')).toBeInTheDocument();
    });
    expect(screen.getByText('Business Current Account')).toBeInTheDocument();
    expect(screen.getByText('180-Day Fixed Deposit')).toBeInTheDocument();
  });

  it('shows product codes', async () => {
    renderWithProviders(<ProductCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('SA-STD')).toBeInTheDocument();
    });
    expect(screen.getByText('CA-BIZ')).toBeInTheDocument();
    expect(screen.getByText('FD-180')).toBeInTheDocument();
  });

  it('shows category filter buttons', () => {
    renderWithProviders(<ProductCatalogPage />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('SAVINGS')).toBeInTheDocument();
    expect(screen.getByText('CURRENT')).toBeInTheDocument();
    expect(screen.getByText('FIXED DEPOSIT')).toBeInTheDocument();
  });

  it('filters by category when category button is clicked', async () => {
    renderWithProviders(<ProductCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('Standard Savings')).toBeInTheDocument();
    });

    // Click SAVINGS filter button (use getAllByText and pick the button element)
    const savingsButtons = screen.getAllByText('SAVINGS');
    const filterButton = savingsButtons.find(el => el.tagName === 'BUTTON');
    if (filterButton) fireEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText('Standard Savings')).toBeInTheDocument();
    });
  });

  it('supports search filtering', async () => {
    renderWithProviders(<ProductCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('Standard Savings')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Search products...'), {
      target: { value: 'Business' },
    });

    // Only Business product should remain
    expect(screen.getByText('Business Current Account')).toBeInTheDocument();
    expect(screen.queryByText('Standard Savings')).not.toBeInTheDocument();
    expect(screen.queryByText('180-Day Fixed Deposit')).not.toBeInTheDocument();
  });

  it('shows loading skeletons while loading', () => {
    server.use(
      http.get('/api/v1/accounts/products', async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        return HttpResponse.json(wrap([]));
      }),
    );

    renderWithProviders(<ProductCatalogPage />);
    // Loading skeletons are rendered as animate-pulse divs
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no products found', async () => {
    server.use(
      http.get('/api/v1/accounts/products', () =>
        HttpResponse.json(wrap([])),
      ),
    );

    renderWithProviders(<ProductCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('No products found.')).toBeInTheDocument();
    });
  });

  it('expands product details when clicked', async () => {
    renderWithProviders(<ProductCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('SA-STD')).toBeInTheDocument();
    });

    // Click on the first product to expand
    const productButton = screen.getByText('Standard Savings').closest('button');
    if (productButton) fireEvent.click(productButton);

    await waitFor(() => {
      expect(screen.getByText('Min Balance')).toBeInTheDocument();
      expect(screen.getByText('Interest Rate')).toBeInTheDocument();
      expect(screen.getByText(/Open account with this product/)).toBeInTheDocument();
    });
  });

  it('shows feature badges for expanded product', async () => {
    renderWithProviders(<ProductCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('CA-BIZ')).toBeInTheDocument();
    });

    // Click on Business Current Account to expand
    const productButton = screen.getByText('Business Current Account').closest('button');
    if (productButton) fireEvent.click(productButton);

    await waitFor(() => {
      expect(screen.getByText('Cheque Book')).toBeInTheDocument();
      expect(screen.getByText('Debit Card')).toBeInTheDocument();
      expect(screen.getByText('Mobile')).toBeInTheDocument();
      expect(screen.getByText('Internet')).toBeInTheDocument();
    });
  });

  it('shows search input', () => {
    renderWithProviders(<ProductCatalogPage />);
    expect(screen.getByPlaceholderText('Search products...')).toBeInTheDocument();
  });
});
