import { describe, it, expect } from 'vitest';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { almApi } from '../api/almApi';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

describe('almApi', () => {
  describe('Gap Reports', () => {
    it('getGapReports calls GET /api/v1/alm/gap-report', async () => {
      const mockReports = [{ id: 1, reportDate: '2026-03-20', currencyCode: 'NGN' }];
      server.use(http.get('/api/v1/alm/gap-report', () => HttpResponse.json(wrap(mockReports))));
      const result = await almApi.getGapReports();
      expect(result).toEqual(mockReports);
    });

    it('getGapReportsByDate calls GET /api/v1/alm/gap-report/:date', async () => {
      const mockReports = [{ id: 1, reportDate: '2026-03-20', currencyCode: 'NGN' }];
      server.use(http.get('/api/v1/alm/gap-report/:date', () => HttpResponse.json(wrap(mockReports))));
      const result = await almApi.getGapReportsByDate('2026-03-20');
      expect(result).toEqual(mockReports);
    });

    it('generateGapReport sends params as query and buckets as body', async () => {
      const mockReport = { id: 1, reportDate: '2026-03-20' };
      let capturedUrl = '';
      server.use(http.post('/api/v1/alm/gap-report', ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(wrap(mockReport));
      }));
      const result = await almApi.generateGapReport({
        reportDate: '2026-03-20',
        currencyCode: 'NGN',
        totalRsa: 80000000000,
        totalRsl: 75000000000,
        avgAssetDuration: 3.5,
      });
      expect(result).toEqual(mockReport);
      expect(capturedUrl).toContain('reportDate=2026-03-20');
      expect(capturedUrl).toContain('currencyCode=NGN');
      expect(capturedUrl).toContain('avgAssetDuration=3.5');
    });

    it('approveGapReport calls POST /api/v1/alm/gap-report/:id/approve', async () => {
      const mockReport = { id: 1, status: 'FINAL' };
      server.use(http.post('/api/v1/alm/gap-report/:id/approve', () => HttpResponse.json(wrap(mockReport))));
      const result = await almApi.approveGapReport(1);
      expect(result.status).toBe('FINAL');
    });
  });

  describe('Scenarios', () => {
    it('getScenarios calls GET /api/v1/alm/scenarios', async () => {
      const mockScenarios = [{ id: 1, scenarioName: 'Test' }];
      server.use(http.get('/api/v1/alm/scenarios', () => HttpResponse.json(wrap(mockScenarios))));
      const result = await almApi.getScenarios();
      expect(result).toEqual(mockScenarios);
    });

    it('createScenario sends scenario payload', async () => {
      const payload = { scenarioName: 'Custom', scenarioType: 'CUSTOM', shiftBps: { '1Y': 100 }, description: 'Test' };
      server.use(http.post('/api/v1/alm/scenarios', () => HttpResponse.json(wrap({ id: 5, ...payload }))));
      const result = await almApi.createScenario(payload);
      expect(result.scenarioName).toBe('Custom');
    });
  });

  describe('ALCO Pack', () => {
    it('getAlcoPacks calls GET /api/v1/alm/alco-packs', async () => {
      const mockPacks = [{ id: 1, month: '2026-03' }];
      server.use(http.get('/api/v1/alm/alco-packs', () => HttpResponse.json(wrap(mockPacks))));
      const result = await almApi.getAlcoPacks();
      expect(result).toEqual(mockPacks);
    });

    it('createAlcoPack sends pack payload', async () => {
      const payload = { month: '2026-03', sections: ['gap-analysis'], executiveSummary: 'Summary' };
      server.use(http.post('/api/v1/alm/alco-packs', () => HttpResponse.json(wrap({ id: 1, ...payload, status: 'DRAFT' }))));
      const result = await almApi.createAlcoPack(payload);
      expect(result.status).toBe('DRAFT');
    });

    it('updateAlcoPack sends PATCH with sections and summary', async () => {
      let capturedBody: unknown = null;
      server.use(http.patch('/api/v1/alm/alco-packs/:id', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(wrap({ id: 1, status: 'DRAFT' }));
      }));
      await almApi.updateAlcoPack(1, { sections: ['gap-analysis', 'duration-report'], executiveSummary: 'Updated' });
      expect(capturedBody).toEqual({ sections: ['gap-analysis', 'duration-report'], executiveSummary: 'Updated' });
    });

    it('workflow: submit → approve → distribute', async () => {
      server.use(
        http.post('/api/v1/alm/alco-packs/:id/submit', () => HttpResponse.json(wrap({ id: 1, status: 'PENDING_REVIEW' }))),
        http.post('/api/v1/alm/alco-packs/:id/approve', () => HttpResponse.json(wrap({ id: 1, status: 'APPROVED' }))),
        http.post('/api/v1/alm/alco-packs/:id/distribute', () => HttpResponse.json(wrap({ id: 1, status: 'DISTRIBUTED' }))),
      );
      const submitted = await almApi.submitAlcoPackForReview(1);
      expect(submitted.status).toBe('PENDING_REVIEW');
      const approved = await almApi.approveAlcoPack(1);
      expect(approved.status).toBe('APPROVED');
      const distributed = await almApi.distributeAlcoPack(1);
      expect(distributed.status).toBe('DISTRIBUTED');
    });
  });

  describe('Action Items', () => {
    it('getActionItems calls GET /api/v1/alm/action-items', async () => {
      const items = [{ id: 1, itemNumber: 'AI-0001', status: 'OPEN' }];
      server.use(http.get('/api/v1/alm/action-items', () => HttpResponse.json(wrap(items))));
      const result = await almApi.getActionItems();
      expect(result).toEqual(items);
    });

    it('createActionItem sends item payload', async () => {
      server.use(http.post('/api/v1/alm/action-items', () => HttpResponse.json(wrap({ id: 1, itemNumber: 'AI-0001', status: 'OPEN' }))));
      const result = await almApi.createActionItem({
        description: 'Test item',
        owner: 'Test Owner',
        dueDate: '2026-04-01',
        status: 'OPEN',
        updateNotes: '',
        meetingDate: '2026-03-15',
      });
      expect(result.itemNumber).toBe('AI-0001');
    });

    it('updateActionItemStatus sends PATCH with status', async () => {
      let capturedBody: unknown = null;
      server.use(http.patch('/api/v1/alm/action-items/:id', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(wrap({ id: 1, status: 'CLOSED' }));
      }));
      await almApi.updateActionItemStatus(1, { status: 'CLOSED', updateNotes: 'Completed' });
      expect(capturedBody).toEqual({ status: 'CLOSED', updateNotes: 'Completed' });
    });
  });

  describe('Regulatory Returns', () => {
    it('getRegulatoryReturns calls GET /api/v1/alm/regulatory-returns', async () => {
      const returns = [{ id: 1, code: 'IRRBB', status: 'DRAFT' }];
      server.use(http.get('/api/v1/alm/regulatory-returns', () => HttpResponse.json(wrap(returns))));
      const result = await almApi.getRegulatoryReturns();
      expect(result).toEqual(returns);
    });

    it('validateReturn calls POST /api/v1/alm/regulatory-returns/:id/validate', async () => {
      server.use(http.post('/api/v1/alm/regulatory-returns/:id/validate', () => HttpResponse.json(wrap({ errors: [], warnings: [] }))));
      const result = await almApi.validateReturn(1);
      expect(result.errors).toEqual([]);
    });

    it('submitReturn calls POST /api/v1/alm/regulatory-returns/:id/submit', async () => {
      server.use(http.post('/api/v1/alm/regulatory-returns/:id/submit', () => HttpResponse.json(wrap({ id: 1, referenceNumber: 'CBN-IRRBB-123', status: 'SUBMITTED' }))));
      const result = await almApi.submitReturn(1);
      expect(result.status).toBe('SUBMITTED');
    });

    it('getAllSubmissions returns submission history', async () => {
      const submissions = [{ id: 1, returnCode: 'LCR', referenceNumber: 'CBN-LCR-123' }];
      server.use(http.get('/api/v1/alm/regulatory-submissions', () => HttpResponse.json(wrap(submissions))));
      const result = await almApi.getAllSubmissions();
      expect(result).toEqual(submissions);
    });
  });

  describe('Stress Testing', () => {
    it('runScenario calls POST /api/v1/alm/scenarios/:id/run', async () => {
      const mockResult = { scenarioId: 1, niiImpact: 100000000, eveImpact: -200000000 };
      server.use(http.post('/api/v1/alm/scenarios/:id/run', () => HttpResponse.json(wrap(mockResult))));
      const result = await almApi.runScenario(1);
      expect(result.scenarioId).toBe(1);
    });

    it('historicalReplay calls GET /api/v1/alm/scenarios/historical/:crisisName', async () => {
      const mockResult = { crisisName: 'GFC_2008', totalMonths: 13 };
      server.use(http.get('/api/v1/alm/scenarios/historical/:crisisName', () => HttpResponse.json(wrap(mockResult))));
      const result = await almApi.historicalReplay('GFC_2008');
      expect(result.crisisName).toBe('GFC_2008');
    });

    it('compareScenarios sends scenario IDs array', async () => {
      let capturedBody: unknown = null;
      server.use(http.post('/api/v1/alm/scenarios/compare', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(wrap({ scenarios: [], comparedAt: '2026-03-22T10:00:00Z' }));
      }));
      await almApi.compareScenarios([1, 2, 3]);
      expect(capturedBody).toEqual([1, 2, 3]);
    });
  });

  describe('Duration', () => {
    it('getDurationAnalytics calls GET /api/v1/alm/duration/:portfolioCode', async () => {
      const mockResult = { portfolioCode: 'MAIN', durationGap: 1.4, dv01: 125000 };
      server.use(http.get('/api/v1/alm/duration/:portfolioCode', () => HttpResponse.json(wrap(mockResult))));
      const result = await almApi.getDurationAnalytics('MAIN');
      expect(result.portfolioCode).toBe('MAIN');
      expect(result.durationGap).toBe(1.4);
    });
  });
});
