import { http, HttpResponse } from 'msw';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

export const riskHandlers = [
  http.get('/api/v1/risk/market/var-stats', () => HttpResponse.json(wrap({ portfolioVar95: 890000000, expectedShortfall975: 1200000000, varLimit: 1500000000, utilizationPct: 59, capitalCharge: 2300000000, worstStressLoss: 3100000000, currency: 'NGN' }))),
  http.get('/api/v1/risk/market/var-trend', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/risk/market/var-by-factor', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/risk/market/stress-tests', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/risk/market/sensitivities', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/risk/market/backtest', () => HttpResponse.json(wrap({ totalDays: 250, exceptions: 3, zone: 'GREEN' }))),
  http.get('/api/v1/risk/liquidity/ratios', () => HttpResponse.json(wrap({ lcr: 145, lcrMin: 100, nsfr: 112, nsfrMin: 100, cashReserve: 32.5, cashReserveReq: 32.5 }))),
  http.get('/api/v1/risk/liquidity/cashflow-ladder', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/risk/liquidity/hqla', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/risk/liquidity/stress-projection', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/risk/operational/stats', () => HttpResponse.json(wrap({ lossEventsMtd: 8, totalLossMtd: 12000000, openIncidents: 5, krisBreached: 2, rcsaDue: 3, currency: 'NGN' }))),
  http.get('/api/v1/risk/operational/loss-events', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/risk/operational/loss-by-category', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/risk/operational/loss-trend', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/risk/operational/kris', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/risk/operational/rcsa', () => HttpResponse.json(wrap([]))),
  http.get('/api/v1/risk/operational/incidents', () => HttpResponse.json(wrap([]))),
];
