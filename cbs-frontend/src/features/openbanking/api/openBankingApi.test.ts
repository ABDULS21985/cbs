import { describe, it, expect } from 'vitest';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { openBankingApi } from './openBankingApi';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

describe('openBankingApi', () => {
  describe('getTppClients', () => {
    it('maps backend fields correctly', async () => {
      server.use(
        http.get('/api/v1/openbanking/clients', () =>
          HttpResponse.json(wrap([
            {
              id: 1, clientId: 'C1', clientName: 'Test TPP', clientType: 'TPP_AISP',
              isActive: true, redirectUris: ['https://example.com/cb'],
              allowedScopes: ['accounts', 'balances'], dailyRequestCount: 42,
              createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z',
            },
          ])),
        ),
      );

      const clients = await openBankingApi.getTppClients();
      expect(clients).toHaveLength(1);

      const c = clients[0];
      expect(c.name).toBe('Test TPP');
      expect(c.clientName).toBe('Test TPP');
      expect(c.clientId).toBe('C1');
      expect(c.status).toBe('ACTIVE');
      expect(c.scopes).toEqual(['accounts', 'balances']);
      expect(c.redirectUri).toBe('https://example.com/cb');
      expect(c.redirectUris).toEqual(['https://example.com/cb']);
      expect(c.clientType).toBe('TPP_AISP');
    });

    it('maps inactive client status correctly', async () => {
      server.use(
        http.get('/api/v1/openbanking/clients', () =>
          HttpResponse.json(wrap([
            {
              id: 2, clientId: 'C2', clientName: 'Inactive TPP', clientType: 'TPP_PISP',
              isActive: false, redirectUris: [], allowedScopes: [],
              dailyRequestCount: 0, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
            },
          ])),
        ),
      );

      const clients = await openBankingApi.getTppClients();
      expect(clients[0].status).toBe('INACTIVE');
    });
  });

  describe('getConsents', () => {
    it('maps AWAITING_AUTHORISATION to PENDING', async () => {
      server.use(
        http.get('/api/v1/openbanking/clients', () => HttpResponse.json(wrap([
          { id: 1, clientId: 'C1', clientName: 'TPP1', clientType: 'TPP_AISP', isActive: true,
            redirectUris: [], allowedScopes: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
        ]))),
        http.get('/api/v1/openbanking/consents', () => HttpResponse.json(wrap([
          {
            id: 1, consentId: 'CST-001', clientId: 'C1', customerId: 100,
            consentType: 'ACCOUNT_ACCESS', permissions: ['ReadAccountsBasic'],
            accountIds: [], status: 'AWAITING_AUTHORISATION',
            expiresAt: '2027-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z',
          },
        ]))),
      );

      const consents = await openBankingApi.getConsents();
      expect(consents).toHaveLength(1);
      expect(consents[0].status).toBe('PENDING');
      expect(consents[0].rawStatus).toBe('AWAITING_AUTHORISATION');
      expect(consents[0].tppClientName).toBe('TPP1');
    });

    it('maps AUTHORISED status correctly', async () => {
      server.use(
        http.get('/api/v1/openbanking/clients', () => HttpResponse.json(wrap([]))),
        http.get('/api/v1/openbanking/consents', () => HttpResponse.json(wrap([
          {
            id: 2, consentId: 'CST-002', clientId: 'C1', customerId: 200,
            consentType: 'PAYMENT_INITIATION', permissions: ['InitiatePayment'],
            accountIds: [], status: 'AUTHORISED', grantedAt: '2026-01-15T00:00:00Z',
            expiresAt: '2027-01-01T00:00:00Z', createdAt: '2026-01-15T00:00:00Z',
          },
        ]))),
      );

      const consents = await openBankingApi.getConsents();
      expect(consents[0].status).toBe('AUTHORISED');
      expect(consents[0].authorisedAt).toBe('2026-01-15T00:00:00Z');
    });

    it('maps REVOKED status with revokedAt', async () => {
      server.use(
        http.get('/api/v1/openbanking/clients', () => HttpResponse.json(wrap([]))),
        http.get('/api/v1/openbanking/consents', () => HttpResponse.json(wrap([
          {
            id: 3, consentId: 'CST-003', clientId: 'C1', customerId: 300,
            consentType: 'ACCOUNT_ACCESS', permissions: ['ReadBalances'],
            accountIds: [], status: 'REVOKED', revokedAt: '2026-02-10T00:00:00Z',
            expiresAt: '2027-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z',
          },
        ]))),
      );

      const consents = await openBankingApi.getConsents();
      expect(consents[0].status).toBe('REVOKED');
      expect(consents[0].revokedAt).toBe('2026-02-10T00:00:00Z');
    });

    it('detects expired consents even if backend status is AUTHORISED', async () => {
      server.use(
        http.get('/api/v1/openbanking/clients', () => HttpResponse.json(wrap([]))),
        http.get('/api/v1/openbanking/consents', () => HttpResponse.json(wrap([
          {
            id: 4, consentId: 'CST-004', clientId: 'C1', customerId: 400,
            consentType: 'ACCOUNT_ACCESS', permissions: [],
            accountIds: [], status: 'AUTHORISED',
            grantedAt: '2024-01-01T00:00:00Z', expiresAt: '2024-06-01T00:00:00Z',
            createdAt: '2024-01-01T00:00:00Z',
          },
        ]))),
      );

      const consents = await openBankingApi.getConsents();
      // Expired because expiresAt is in the past
      expect(consents[0].status).toBe('EXPIRED');
    });
  });

  describe('createConsent', () => {
    it('sends correct request params', async () => {
      let capturedParams: URLSearchParams | undefined;

      server.use(
        http.get('/api/v1/openbanking/clients', () => HttpResponse.json(wrap([]))),
        http.post('/api/v1/openbanking/consents', ({ request }) => {
          capturedParams = new URL(request.url).searchParams;
          return HttpResponse.json(wrap({
            id: 10, consentId: 'CST-NEW', clientId: 'C1', customerId: 100,
            consentType: 'ACCOUNT_ACCESS', permissions: ['ReadAccountsBasic'],
            accountIds: [], status: 'AWAITING_AUTHORISATION',
            expiresAt: '2027-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z',
          }));
        }),
      );

      await openBankingApi.createConsent({
        clientId: 'C1',
        customerId: 100,
        consentType: 'ACCOUNT_ACCESS',
        permissions: ['ReadAccountsBasic'],
        validityMinutes: 720,
      });

      expect(capturedParams?.get('clientId')).toBe('C1');
      expect(capturedParams?.get('customerId')).toBe('100');
      expect(capturedParams?.get('consentType')).toBe('ACCOUNT_ACCESS');
      expect(capturedParams?.get('validityMinutes')).toBe('720');
    });
  });

  describe('authoriseConsent', () => {
    it('sends customerId as request param', async () => {
      let capturedParams: URLSearchParams | undefined;

      server.use(
        http.get('/api/v1/openbanking/clients', () => HttpResponse.json(wrap([]))),
        http.post('/api/v1/openbanking/consents/:consentId/authorise', ({ request }) => {
          capturedParams = new URL(request.url).searchParams;
          return HttpResponse.json(wrap({
            id: 1, consentId: 'CST-001', clientId: 'C1', customerId: 100,
            consentType: 'ACCOUNT_ACCESS', permissions: [],
            accountIds: [], status: 'AUTHORISED',
            grantedAt: '2026-03-01T00:00:00Z', expiresAt: '2027-01-01T00:00:00Z',
            createdAt: '2026-01-01T00:00:00Z',
          }));
        }),
      );

      const result = await openBankingApi.authoriseConsent('CST-001', 100);
      expect(capturedParams?.get('customerId')).toBe('100');
      expect(result.status).toBe('AUTHORISED');
    });
  });

  describe('deactivateClient', () => {
    it('calls the deactivate endpoint and returns mapped client', async () => {
      server.use(
        http.post('/api/v1/openbanking/clients/:clientId/deactivate', () =>
          HttpResponse.json(wrap({
            id: 1, clientId: 'C1', clientName: 'TPP1', clientType: 'TPP_AISP',
            isActive: false, redirectUris: [], allowedScopes: [],
            dailyRequestCount: 0, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z',
          })),
        ),
      );

      const result = await openBankingApi.deactivateClient('C1');
      expect(result.status).toBe('INACTIVE');
      expect(result.isActive).toBe(false);
    });
  });
});
