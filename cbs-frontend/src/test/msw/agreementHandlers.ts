import { http, HttpResponse } from 'msw';
import {
  createMockAgreement,
  createMockTdFramework,
  createMockCommissionAgreement,
  createMockCommissionPayout,
  createMockDiscountScheme,
  createMockSpecialPricing,
  createMockAgreementTemplate,
} from '../factories/agreementFactory';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockAgreements = Array.from({ length: 5 }, (_, i) =>
  createMockAgreement({
    id: i + 1,
    status: i === 0 ? 'DRAFT' : i === 1 ? 'PENDING_SIGNATURE' : i === 2 ? 'ACTIVE' : i === 3 ? 'TERMINATED' : 'EXPIRED',
  }),
);

const mockTdFrameworks = Array.from({ length: 3 }, (_, i) =>
  createMockTdFramework({
    id: i + 100,
    status: i === 0 ? 'DRAFT' : 'ACTIVE',
  }),
);

const mockCommissionAgreements = Array.from({ length: 3 }, (_, i) =>
  createMockCommissionAgreement({
    id: i + 200,
    status: i === 0 ? 'DRAFT' : 'ACTIVE',
  }),
);

const mockPayouts = Array.from({ length: 2 }, (_, i) =>
  createMockCommissionPayout({
    id: i + 300,
    status: i === 0 ? 'CALCULATED' : 'APPROVED',
  }),
);

const mockDiscountSchemes = Array.from({ length: 3 }, (_, i) =>
  createMockDiscountScheme({
    id: i + 400,
    status: i === 0 ? 'DRAFT' : 'ACTIVE',
  }),
);

const mockSpecialPricing = Array.from({ length: 2 }, (_, i) =>
  createMockSpecialPricing({ id: i + 500 }),
);

const mockTemplates = Array.from({ length: 3 }, (_, i) =>
  createMockAgreementTemplate({ id: i + 600 }),
);

export const agreementHandlers = [
  // Customer Agreements
  http.get('/api/v1/agreements', () => HttpResponse.json(wrap(mockAgreements))),
  http.get('/api/v1/agreements/:id', ({ params }) => {
    const a = mockAgreements.find((a) => a.id === Number(params.id));
    return a ? HttpResponse.json(wrap(a)) : HttpResponse.json(wrap(null), { status: 404 });
  }),
  http.post('/api/v1/agreements', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(wrap(createMockAgreement(body)), { status: 201 });
  }),
  http.put('/api/v1/agreements/:id', async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(wrap(createMockAgreement({ id: Number(params.id), ...body })));
  }),
  http.post('/api/v1/agreements/:number/activate', ({ params }) =>
    HttpResponse.json(wrap(createMockAgreement({ agreementNumber: params.number as string, status: 'ACTIVE' }))),
  ),
  http.post('/api/v1/agreements/:number/terminate', ({ params }) =>
    HttpResponse.json(wrap(createMockAgreement({ agreementNumber: params.number as string, status: 'TERMINATED' }))),
  ),
  http.get('/api/v1/agreements/customer/:id', () => HttpResponse.json(wrap(mockAgreements.slice(0, 2)))),

  // TD Frameworks
  http.get('/api/v1/td-frameworks', () => HttpResponse.json(wrap(mockTdFrameworks))),
  http.get('/api/v1/td-frameworks/:number', ({ params }) => {
    const f = mockTdFrameworks.find((f) => f.agreementNumber === params.number);
    return f ? HttpResponse.json(wrap(f)) : HttpResponse.json(wrap(mockTdFrameworks[0]));
  }),
  http.post('/api/v1/td-frameworks', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(wrap(createMockTdFramework(body)), { status: 201 });
  }),
  http.post('/api/v1/td-frameworks/:number/approve', () =>
    HttpResponse.json(wrap(createMockTdFramework({ status: 'ACTIVE' }))),
  ),
  http.get('/api/v1/td-frameworks/:number/rate', () =>
    HttpResponse.json(wrap({ agreement: 'TDF-001', amount: 500000, tenor_days: 90, applicable_rate: 4.5 })),
  ),
  http.get('/api/v1/td-frameworks/customer/:id', () => HttpResponse.json(wrap(mockTdFrameworks.slice(0, 1)))),

  // TD Framework Summary
  http.post('/api/v1/td-framework-summary', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(wrap({ id: 1, ...body }), { status: 201 });
  }),
  http.get('/api/v1/td-framework-summary/:id/maturity-ladder', () =>
    HttpResponse.json(wrap({ next30: 500000, next60: 750000, next90: 1200000 })),
  ),
  http.get('/api/v1/td-framework-summary/:id/rollover-forecast', () =>
    HttpResponse.json(wrap({ totalPrincipal: 5000000, expectedRolloverPct: 72.5, expectedRolloverAmount: 3625000 })),
  ),
  http.get('/api/v1/td-framework-summary/large-deposits', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/td-framework-summary/:id/history', () => HttpResponse.json(wrap([]))),

  // Commissions
  http.get('/api/v1/commissions/agreements', () => HttpResponse.json(wrap(mockCommissionAgreements))),
  http.get('/api/v1/commissions/agreements/:code', ({ params }) => {
    const a = mockCommissionAgreements.find((a) => a.agreementCode === params.code);
    return a ? HttpResponse.json(wrap(a)) : HttpResponse.json(wrap(mockCommissionAgreements[0]));
  }),
  http.post('/api/v1/commissions/agreements', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(wrap(createMockCommissionAgreement(body)), { status: 201 });
  }),
  http.post('/api/v1/commissions/agreements/:code/activate', () =>
    HttpResponse.json(wrap(createMockCommissionAgreement({ status: 'ACTIVE' }))),
  ),
  http.post('/api/v1/commissions/agreements/:code/calculate-payout', async () =>
    HttpResponse.json(wrap(createMockCommissionPayout()), { status: 201 }),
  ),
  http.post('/api/v1/commissions/payouts/:code/approve', () =>
    HttpResponse.json(wrap(createMockCommissionPayout({ status: 'APPROVED' }))),
  ),
  http.get('/api/v1/commissions/agreements/party/:id', () => HttpResponse.json(wrap(mockCommissionAgreements.slice(0, 1)))),
  http.get('/api/v1/commissions/payouts/party/:id', () => HttpResponse.json(wrap(mockPayouts))),

  // Pricing - Discounts
  http.get('/api/v1/pricing/discounts', () => HttpResponse.json(wrap(mockDiscountSchemes))),
  http.get('/api/v1/pricing/discounts/active', () =>
    HttpResponse.json(wrap(mockDiscountSchemes.filter((s) => s.status === 'ACTIVE'))),
  ),
  http.post('/api/v1/pricing/discounts', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(wrap(createMockDiscountScheme(body)), { status: 201 });
  }),
  http.get('/api/v1/pricing/discounts/evaluate', () =>
    HttpResponse.json(wrap({ status: 'READY' })),
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
  http.get('/api/v1/pricing/discounts/utilization', () =>
    HttpResponse.json(wrap(mockDiscountSchemes.filter((s) => s.status === 'ACTIVE'))),
  ),

  // Pricing - Special Pricing
  http.get('/api/v1/pricing/special-pricing', () => HttpResponse.json(wrap(mockSpecialPricing))),
  http.post('/api/v1/pricing/special-pricing', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(wrap(createMockSpecialPricing(body)), { status: 201 });
  }),
  http.get('/api/v1/pricing/special-pricing/customer/:id', () =>
    HttpResponse.json(wrap(mockSpecialPricing.slice(0, 1))),
  ),
  http.put('/api/v1/pricing/special-pricing/:id/review', () =>
    HttpResponse.json(wrap(createMockSpecialPricing({ status: 'UNDER_REVIEW' }))),
  ),

  // Templates
  http.get('/api/v1/agreement-templates', () => HttpResponse.json(wrap(mockTemplates))),
];
