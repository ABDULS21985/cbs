import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw/server';
import {
  getNostroAccounts,
  getBreaks,
  getBreakTimeline,
  resolveBreak,
  escalateBreak,
  addBreakNote,
  bulkAssignBreaks,
  bulkEscalateBreaks,
  getImportHistory,
  reImportStatement,
  deleteImport,
  getAutoFetchConfigs,
  getComplianceChecklist,
  getComplianceScoreTrend,
  confirmImport,
  rejectImport,
} from '../api/reconciliationApi';
import { nostroApi } from '../api/nostroApi';
import { glReconApi } from '../api/glReconApi';

// ── API Contract Tests ──────────────────────────────────────────────────────

describe('reconciliationApi', () => {
  describe('getNostroAccounts', () => {
    it('calls GET /v1/reconciliation/nostro-accounts', async () => {
      const mockData = [{ id: 1, positionType: 'NOSTRO', currencyCode: 'USD' }];
      server.use(
        http.get('/api/v1/reconciliation/nostro-accounts', () =>
          HttpResponse.json({ data: mockData }),
        ),
      );
      const result = await getNostroAccounts();
      expect(result).toEqual(mockData);
    });
  });

  describe('getBreaks', () => {
    it('calls GET /v1/reconciliation/breaks with filters', async () => {
      const mockBreaks = [{ id: '1', status: 'OPEN', amount: 500 }];
      server.use(
        http.get('/api/v1/reconciliation/breaks', ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('status')).toBe('OPEN');
          return HttpResponse.json({ data: mockBreaks });
        }),
      );
      const result = await getBreaks({ status: 'OPEN' });
      expect(result).toEqual(mockBreaks);
    });
  });

  describe('getBreakTimeline', () => {
    it('calls GET /v1/reconciliation/breaks/:id/timeline', async () => {
      const mockTimeline = [
        { id: '10', timestamp: '2026-03-22T10:00:00Z', actor: 'admin', action: 'Created', notes: '', type: 'INFO' },
      ];
      server.use(
        http.get('/api/v1/reconciliation/breaks/1/timeline', () =>
          HttpResponse.json({ data: mockTimeline }),
        ),
      );
      const result = await getBreakTimeline('1');
      expect(result).toEqual(mockTimeline);
    });
  });

  describe('resolveBreak', () => {
    it('calls POST /v1/reconciliation/breaks/:id/resolve', async () => {
      server.use(
        http.post('/api/v1/reconciliation/breaks/1/resolve', async ({ request }) => {
          const body = await request.json() as Record<string, unknown>;
          expect(body.resolutionType).toBe('WRITE_OFF');
          expect(body.reason).toBe('Below threshold');
          return HttpResponse.json({ data: { success: true } });
        }),
      );
      const result = await resolveBreak('1', {
        resolutionType: 'WRITE_OFF',
        reason: 'Below threshold',
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('escalateBreak', () => {
    it('calls POST /v1/reconciliation/breaks/:id/escalate', async () => {
      server.use(
        http.post('/api/v1/reconciliation/breaks/2/escalate', async ({ request }) => {
          const body = await request.json() as Record<string, unknown>;
          expect(body.notes).toBe('Needs manager review');
          return HttpResponse.json({ data: { success: true } });
        }),
      );
      const result = await escalateBreak('2', 'Needs manager review');
      expect(result).toEqual({ success: true });
    });
  });

  describe('addBreakNote', () => {
    it('calls POST /v1/reconciliation/breaks/:id/notes', async () => {
      const mockEvent = { id: '50', timestamp: new Date().toISOString(), actor: 'user', action: 'Note added', notes: 'Checking', type: 'INFO' };
      server.use(
        http.post('/api/v1/reconciliation/breaks/1/notes', () =>
          HttpResponse.json({ data: mockEvent }),
        ),
      );
      const result = await addBreakNote('1', 'Checking');
      expect(result.type).toBe('INFO');
    });
  });

  describe('bulkAssignBreaks', () => {
    it('calls POST /v1/reconciliation/breaks/bulk-assign', async () => {
      server.use(
        http.post('/api/v1/reconciliation/breaks/bulk-assign', async ({ request }) => {
          const body = await request.json() as Record<string, unknown>;
          expect(body.breakIds).toEqual(['1', '2']);
          expect(body.assignedTo).toBe('new_officer');
          return HttpResponse.json({ data: { success: true } });
        }),
      );
      const result = await bulkAssignBreaks(['1', '2'], 'new_officer');
      expect(result).toEqual({ success: true });
    });
  });

  describe('bulkEscalateBreaks', () => {
    it('calls POST /v1/reconciliation/breaks/bulk-escalate', async () => {
      server.use(
        http.post('/api/v1/reconciliation/breaks/bulk-escalate', () =>
          HttpResponse.json({ data: { success: true } }),
        ),
      );
      const result = await bulkEscalateBreaks(['1', '2'], 'Bulk escalation');
      expect(result).toEqual({ success: true });
    });
  });

  describe('getImportHistory', () => {
    it('calls GET /v1/reconciliation/statements/history', async () => {
      server.use(
        http.get('/api/v1/reconciliation/statements/history', () =>
          HttpResponse.json({ data: [] }),
        ),
      );
      const result = await getImportHistory();
      expect(result).toEqual([]);
    });
  });

  describe('reImportStatement', () => {
    it('calls POST /v1/reconciliation/statements/:id/reimport', async () => {
      server.use(
        http.post('/api/v1/reconciliation/statements/5/reimport', () =>
          HttpResponse.json({ data: { success: true } }),
        ),
      );
      const result = await reImportStatement('5');
      expect(result).toEqual({ success: true });
    });
  });

  describe('deleteImport', () => {
    it('calls POST /v1/reconciliation/statements/:id/delete', async () => {
      server.use(
        http.post('/api/v1/reconciliation/statements/5/delete', () =>
          HttpResponse.json({ data: { success: true } }),
        ),
      );
      const result = await deleteImport('5');
      expect(result).toEqual({ success: true });
    });
  });

  describe('getAutoFetchConfigs', () => {
    it('calls GET /v1/reconciliation/auto-fetch/configs', async () => {
      const mockConfigs = [
        { id: '1', bankName: 'JPMorgan', protocol: 'SFTP', host: 'sftp.jpmc.com', schedule: '0 6 * * *', lastFetch: null, status: 'ACTIVE', accountPattern: '*' },
      ];
      server.use(
        http.get('/api/v1/reconciliation/auto-fetch/configs', () =>
          HttpResponse.json({ data: mockConfigs }),
        ),
      );
      const result = await getAutoFetchConfigs();
      expect(result).toHaveLength(1);
      expect(result[0].protocol).toBe('SFTP');
    });
  });

  describe('compliance', () => {
    it('getComplianceChecklist returns 5 items', async () => {
      const mockChecklist = Array.from({ length: 5 }, (_, i) => ({
        id: `CBN-${i}`, requirement: `Req ${i}`, description: `Desc ${i}`, met: i < 3, lastChecked: new Date().toISOString(),
      }));
      server.use(
        http.get('/api/v1/reconciliation/compliance/checklist', () =>
          HttpResponse.json({ data: mockChecklist }),
        ),
      );
      const result = await getComplianceChecklist();
      expect(result).toHaveLength(5);
    });

    it('getComplianceScoreTrend returns 12 months', async () => {
      const mockTrend = Array.from({ length: 12 }, (_, i) => ({
        month: `2025-${String(i + 1).padStart(2, '0')}`, score: 90 + i, target: 95,
      }));
      server.use(
        http.get('/api/v1/reconciliation/compliance/score-trend', () =>
          HttpResponse.json({ data: mockTrend }),
        ),
      );
      const result = await getComplianceScoreTrend();
      expect(result).toHaveLength(12);
    });
  });

  describe('confirmImport', () => {
    it('calls POST /v1/reconciliation/statements/confirm', async () => {
      server.use(
        http.post('/api/v1/reconciliation/statements/confirm', async ({ request }) => {
          const body = await request.json() as Record<string, unknown>;
          expect(body.positionId).toBe('100');
          expect(body.statementDate).toBe('2026-03-21');
          return HttpResponse.json({ data: { importId: '42' } });
        }),
      );
      const result = await confirmImport('100', '2026-03-21');
      expect(result.importId).toBe('42');
    });
  });

  describe('rejectImport', () => {
    it('calls POST /v1/reconciliation/statements/reject', async () => {
      server.use(
        http.post('/api/v1/reconciliation/statements/reject', () =>
          HttpResponse.json({ data: { success: true } }),
        ),
      );
      const result = await rejectImport('100', '2026-03-21');
      expect(result.success).toBe(true);
    });
  });
});

describe('nostroApi', () => {
  it('listBanks calls GET /v1/nostro/banks', async () => {
    server.use(
      http.get('/api/v1/nostro/banks', () =>
        HttpResponse.json({ data: [{ id: 1, bankName: 'Test Bank' }] }),
      ),
    );
    const result = await nostroApi.listBanks();
    expect(result).toHaveLength(1);
  });

  it('listPositions calls GET /v1/nostro/positions', async () => {
    server.use(
      http.get('/api/v1/nostro/positions', () =>
        HttpResponse.json({ data: [{ id: 1, positionType: 'NOSTRO' }] }),
      ),
    );
    const result = await nostroApi.listPositions();
    expect(result).toHaveLength(1);
  });

  it('getPosition calls GET /v1/nostro/positions/:id', async () => {
    server.use(
      http.get('/api/v1/nostro/positions/1', () =>
        HttpResponse.json({ data: { id: 1, positionType: 'NOSTRO', currencyCode: 'USD' } }),
      ),
    );
    const result = await nostroApi.getPosition(1);
    expect(result.currencyCode).toBe('USD');
  });

  it('addReconItem calls POST /v1/nostro/positions/:id/recon-items', async () => {
    server.use(
      http.post('/api/v1/nostro/positions/1/recon-items', () =>
        HttpResponse.json({ data: { id: 10, matchStatus: 'UNMATCHED' } }),
      ),
    );
    const result = await nostroApi.addReconItem(1, {
      itemType: 'DEBIT_OUR_BOOKS',
      reference: 'TXN-001',
      amount: 500,
      valueDate: '2026-03-22',
    });
    expect(result.matchStatus).toBe('UNMATCHED');
  });

  it('matchItem calls POST /v1/nostro/recon-items/:id/match', async () => {
    server.use(
      http.post('/api/v1/nostro/recon-items/10/match', () =>
        HttpResponse.json({ data: { id: 10, matchStatus: 'MATCHED', matchReference: 'REF-001' } }),
      ),
    );
    const result = await nostroApi.matchItem(10, 'REF-001', 'officer');
    expect(result.matchStatus).toBe('MATCHED');
  });
});

describe('glReconApi', () => {
  it('listReconRuns calls GET /v1/gl/reconciliation', async () => {
    server.use(
      http.get('/api/v1/gl/reconciliation', ({ request }) => {
        const url = new URL(request.url);
        // Not a date path segment — it's the list endpoint
        if (url.pathname === '/api/v1/gl/reconciliation') {
          return HttpResponse.json({ data: [{ id: 1, subledgerType: 'ACCOUNTS' }] });
        }
        return HttpResponse.json({ data: [] });
      }),
    );
    const result = await glReconApi.listReconRuns();
    expect(result).toHaveLength(1);
  });

  it('getReconResultsByDate calls GET /v1/gl/reconciliation/:date', async () => {
    server.use(
      http.get('/api/v1/gl/reconciliation/2026-03-22', () =>
        HttpResponse.json({ data: [{ id: 1, reconDate: '2026-03-22', balanced: true }] }),
      ),
    );
    const result = await glReconApi.getReconResultsByDate('2026-03-22');
    expect(result).toHaveLength(1);
  });

  it('runReconciliation calls POST /v1/gl/reconciliation with query params', async () => {
    server.use(
      http.post('/api/v1/gl/reconciliation', ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('subledgerType')).toBe('ACCOUNTS');
        expect(url.searchParams.get('glCode')).toBe('1001');
        expect(url.searchParams.get('reconDate')).toBe('2026-03-22');
        return HttpResponse.json({ data: { id: 1, balanced: true, difference: 0 } });
      }),
    );
    const result = await glReconApi.runReconciliation({
      subledgerType: 'ACCOUNTS',
      glCode: '1001',
      reconDate: '2026-03-22',
    });
    expect(result.balanced).toBe(true);
  });
});
