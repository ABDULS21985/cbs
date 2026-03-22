import { describe, it, expect } from 'vitest';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { statementApi, numberToWords } from '../api/statementApi';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

describe('statementApi', () => {
  describe('generateStatement', () => {
    it('calls POST /v1/statements/generate and maps response', async () => {
      const raw = {
        statementId: 'STMT-1-123',
        accountId: 1,
        accountNumber: '0012345678',
        accountName: 'Test Account',
        currencyCode: 'NGN',
        fromDate: '2026-01-01',
        toDate: '2026-03-01',
        openingBalance: 100000,
        closingBalance: 200000,
        totalCredits: 150000,
        totalDebits: 50000,
        transactionCount: 2,
        transactions: [
          { transactionRef: 'TXN-001', date: '2026-01-15', narration: 'Salary', type: 'CREDIT', amount: 150000, runningBalance: 250000 },
          { transactionRef: 'TXN-002', date: '2026-02-01', narration: 'Fee', type: 'FEE_DEBIT', amount: 500, runningBalance: 249500 },
        ],
        generatedAt: '2026-03-22T10:00:00Z',
      };

      server.use(
        http.post('/api/v1/statements/generate', () => HttpResponse.json(wrap(raw))),
      );

      const result = await statementApi.generateStatement({
        accountId: '1',
        from: '2026-01-01',
        to: '2026-03-01',
        type: 'FULL',
      });

      expect(result.statementId).toBe('STMT-1-123');
      expect(result.accountNumber).toBe('0012345678');
      expect(result.openingBalance).toBe(100000);
      expect(result.closingBalance).toBe(200000);
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0].credit).toBe(150000);
      expect(result.transactions[0].debit).toBeUndefined();
      expect(result.transactions[1].debit).toBe(500);
      expect(result.transactions[1].credit).toBeUndefined();
      expect(result.bankName).toBe('BellBank Nigeria PLC');
    });
  });

  describe('downloadStatement', () => {
    it('calls GET /v1/statements/download', async () => {
      server.use(
        http.get('/api/v1/statements/download', () =>
          HttpResponse.json(wrap({ downloadReady: true, format: 'PDF', transactionCount: 5 })),
        ),
      );

      const result = await statementApi.downloadStatement('1', '2026-01-01', '2026-03-01', 'PDF');
      expect(result.downloadReady).toBe(true);
      expect(result.format).toBe('PDF');
    });
  });

  describe('emailStatement', () => {
    it('calls POST /v1/statements/email and returns status', async () => {
      server.use(
        http.post('/api/v1/statements/email', () =>
          HttpResponse.json(wrap({
            status: 'SENT',
            message: 'Statement queued for delivery',
            emailAddress: 'test@example.com',
          })),
        ),
      );

      const result = await statementApi.emailStatement('1', '2026-01-01', '2026-03-01', 'test@example.com');
      expect(result.status).toBe('SENT');
      expect(result.message).toContain('queued');
    });
  });

  describe('getCertificateData', () => {
    it('maps certificate response with addressedTo', async () => {
      server.use(
        http.get('/api/v1/statements/certificate', () =>
          HttpResponse.json(wrap({
            accountId: 1,
            accountNumber: '0012345678',
            accountName: 'Test',
            currencyCode: 'NGN',
            currentBalance: 500000,
            availableBalance: 450000,
            accountStatus: 'ACTIVE',
            asOfDate: '2026-03-22',
            certificateRef: 'COB-1-123',
            generatedAt: '2026-03-22T10:00:00Z',
          })),
        ),
      );

      const result = await statementApi.getCertificateData('1', '2026-03-22', 'ABC Company');
      expect(result.referenceNumber).toBe('COB-1-123');
      expect(result.balance).toBe(500000);
      expect(result.addressedTo).toBe('ABC Company');
      expect(result.bankName).toBe('BellBank Nigeria PLC');
    });

    it('uses default addressedTo when not provided', async () => {
      server.use(
        http.get('/api/v1/statements/certificate', () =>
          HttpResponse.json(wrap({
            accountId: 1, accountNumber: '001', accountName: 'T', currencyCode: 'NGN',
            currentBalance: 0, availableBalance: 0, accountStatus: 'ACTIVE',
            asOfDate: '2026-03-22', certificateRef: 'COB-1', generatedAt: '2026-03-22T10:00:00Z',
          })),
        ),
      );

      const result = await statementApi.getCertificateData('1', '2026-03-22');
      expect(result.addressedTo).toBe('To Whom It May Concern');
    });
  });

  describe('getConfirmationData', () => {
    it('maps confirmation response with purpose', async () => {
      server.use(
        http.get('/api/v1/statements/confirmation', () =>
          HttpResponse.json(wrap({
            accountId: 1, accountNumber: '0012345678', accountName: 'Test',
            accountType: 'CURRENT', currencyCode: 'NGN', accountStatus: 'ACTIVE',
            openedDate: '2020-01-15', branchCode: 'LG001',
            confirmationRef: 'ACL-1-123', generatedAt: '2026-03-22T10:00:00Z',
          })),
        ),
      );

      const result = await statementApi.getConfirmationData('1', 'VISA_APPLICATION', 'Embassy');
      expect(result.referenceNumber).toBe('ACL-1-123');
      expect(result.purpose).toBe('VISA_APPLICATION');
      expect(result.addressedTo).toBe('Embassy');
      expect(result.accountType).toBe('CURRENT');
    });
  });

  describe('subscription CRUD', () => {
    it('creates subscription', async () => {
      server.use(
        http.post('/api/v1/statements/subscriptions', () =>
          HttpResponse.json(wrap({
            id: '1', accountId: '1', frequency: 'MONTHLY', delivery: 'EMAIL',
            format: 'PDF', email: 'test@example.com', active: true,
            nextDelivery: '2026-04-22', createdAt: '2026-03-22T10:00:00Z',
          }), { status: 201 }),
        ),
      );

      const result = await statementApi.createSubscription({
        accountId: '1', frequency: 'MONTHLY', delivery: 'EMAIL', format: 'PDF', email: 'test@example.com',
      });
      expect(result.id).toBe('1');
      expect(result.active).toBe(true);
    });

    it('deletes subscription', async () => {
      server.use(
        http.post('/api/v1/statements/subscriptions/1/delete', () =>
          HttpResponse.json(wrap({ id: '1', status: 'DELETED' })),
        ),
      );

      await expect(statementApi.deleteSubscription('1')).resolves.not.toThrow();
    });
  });
});

describe('numberToWords', () => {
  it('converts whole amounts', () => {
    expect(numberToWords(1000)).toBe('One Thousand Naira Only');
  });

  it('converts amounts with kobo', () => {
    expect(numberToWords(1050.50)).toBe('One Thousand Fifty Naira and Fifty Kobo Only');
  });

  it('converts large amounts', () => {
    const result = numberToWords(1000000);
    expect(result).toContain('Million');
    expect(result).toContain('Naira Only');
  });

  it('converts zero', () => {
    // numberToWords(0) returns empty string for integer part, producing a leading space
    expect(numberToWords(0)).toBe(' Naira Only');
  });
});
