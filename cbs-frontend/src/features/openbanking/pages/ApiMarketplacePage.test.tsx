import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { ApiMarketplacePage } from './ApiMarketplacePage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockProducts = [
  {
    id: 1,
    productCode: 'PAY-001',
    productName: 'Payments API',
    productCategory: 'Payments',
    apiVersion: '1.0.0',
    description: 'Initiate and track payment orders.',
    documentationUrl: 'https://docs.example.com/payments',
    basePath: '/open-banking/payments',
    supportedMethods: ['POST', 'GET'],
    rateLimitTier: 'GOLD',
    rateLimitPerMin: 120,
    pricingModel: 'PER_CALL',
    pricePerCall: 1.5,
    monthlyPrice: null,
    sandboxAvailable: true,
    requiresApproval: true,
    status: 'PUBLISHED',
    publishedAt: '2026-03-01T08:00:00Z',
    deprecatedAt: null,
    createdAt: '2026-02-01T08:00:00Z',
    updatedAt: '2026-03-01T08:00:00Z',
  },
  {
    id: 2,
    productCode: 'ACC-001',
    productName: 'Accounts API',
    productCategory: 'Accounts',
    apiVersion: '2.1.0',
    description: 'Read balances and account metadata.',
    documentationUrl: null,
    basePath: '/open-banking/accounts',
    supportedMethods: ['GET'],
    rateLimitTier: 'STANDARD',
    rateLimitPerMin: 60,
    pricingModel: 'MONTHLY',
    pricePerCall: null,
    monthlyPrice: 250,
    sandboxAvailable: false,
    requiresApproval: false,
    status: 'DRAFT',
    publishedAt: null,
    deprecatedAt: null,
    createdAt: '2026-02-10T08:00:00Z',
    updatedAt: '2026-03-05T08:00:00Z',
  },
];

describe('ApiMarketplacePage', () => {
  it('uses live product categories for filters and narrows the catalogue', async () => {
    server.use(
      http.get('/api/v1/marketplace/products', () => HttpResponse.json(wrap(mockProducts))),
      http.get('/api/v1/marketplace/subscriptions', () => HttpResponse.json(wrap([]))),
    );

    renderWithProviders(<ApiMarketplacePage />);

    await waitFor(() => {
      expect(screen.getByText('Payments API')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Payments' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accounts' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Payment Initiation' })).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Payments' }).click();

    await waitFor(() => {
      expect(screen.getByText('Payments API')).toBeInTheDocument();
      expect(screen.queryByText('Accounts API')).not.toBeInTheDocument();
    });
  });

  it('approves pending subscriptions from the live queue', async () => {
    let approveCalls = 0;
    let subscriptions = [
      {
        id: 11,
        subscriptionId: 'SUB-001',
        apiProductId: 1,
        subscriberClientId: 44,
        subscriberName: 'FinFlow',
        subscriberEmail: 'ops@finflow.io',
        planTier: 'PREMIUM',
        apiKeyHash: null,
        monthlyCallLimit: 50000,
        callsThisMonth: 1200,
        billingStartDate: '2026-03-01',
        status: 'PENDING',
        approvedBy: null,
        approvedAt: null,
        createdAt: '2026-03-18T08:00:00Z',
        updatedAt: '2026-03-18T08:00:00Z',
      },
    ];

    server.use(
      http.get('/api/v1/marketplace/products', () => HttpResponse.json(wrap(mockProducts))),
      http.get('/api/v1/marketplace/subscriptions', () => HttpResponse.json(wrap(subscriptions))),
      http.post('/api/v1/marketplace/subscriptions/SUB-001/approve', () => {
        approveCalls += 1;
        subscriptions = subscriptions.map((subscription) => ({
          ...subscription,
          status: 'APPROVED',
          approvedBy: 'Platform Ops',
          approvedAt: '2026-03-23T10:00:00Z',
        }));
        return HttpResponse.json(wrap(subscriptions[0]));
      }),
    );

    renderWithProviders(<ApiMarketplacePage />);

    screen.getByRole('button', { name: /Subscriptions/ }).click();

    await waitFor(() => {
      expect(screen.getByText('FinFlow requested access on 18 Mar 2026.')).toBeInTheDocument();
    });

    screen.getByRole('button', { name: 'Approve' }).click();

    await waitFor(() => {
      expect(approveCalls).toBe(1);
      expect(screen.getByText(/Approved by Platform Ops/)).toBeInTheDocument();
    });
  });
});
