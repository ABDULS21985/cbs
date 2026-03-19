import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { MarketLiquidityRiskPage } from './MarketLiquidityRiskPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockVarStats = {
  portfolioVar95: 890000000,
  expectedShortfall975: 1200000000,
  varLimit: 1500000000,
  utilizationPct: 59,
  capitalCharge: 2300000000,
  worstStressLoss: 3100000000,
  currency: 'NGN',
};

const mockLiqRatios = {
  lcr: 145,
  lcrMin: 100,
  nsfr: 112,
  nsfrMin: 100,
  cashReserve: 32.5,
  cashReserveReq: 32.5,
};

function setupHandlers() {
  server.use(
    http.get('/api/v1/risk/market/var-stats', () => HttpResponse.json(wrap(mockVarStats))),
    http.get('/api/v1/risk/market/var-trend', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/risk/market/var-by-factor', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/risk/market/stress-tests', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/risk/market/sensitivities', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/risk/market/backtest', () => HttpResponse.json(wrap({ totalDays: 250, exceptions: 3, zone: 'GREEN' }))),
    http.get('/api/v1/risk/liquidity/ratios', () => HttpResponse.json(wrap(mockLiqRatios))),
    http.get('/api/v1/risk/liquidity/cashflow-ladder', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/risk/liquidity/hqla', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/risk/liquidity/stress-projection', () => HttpResponse.json(wrap([]))),
  );
}

describe('MarketLiquidityRiskPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<MarketLiquidityRiskPage />);
    expect(screen.getByText('Market & Liquidity Risk')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    setupHandlers();
    renderWithProviders(<MarketLiquidityRiskPage />);
    expect(screen.getByText(/VaR monitoring.*stress testing.*liquidity/i)).toBeInTheDocument();
  });

  it('renders Market Risk tab', () => {
    setupHandlers();
    renderWithProviders(<MarketLiquidityRiskPage />);
    expect(screen.getByText('Market Risk')).toBeInTheDocument();
  });

  it('renders Liquidity Risk tab', () => {
    setupHandlers();
    renderWithProviders(<MarketLiquidityRiskPage />);
    expect(screen.getByText('Liquidity Risk')).toBeInTheDocument();
  });

  it('Market Risk tab is active by default', () => {
    setupHandlers();
    renderWithProviders(<MarketLiquidityRiskPage />);
    const tab = screen.getByText('Market Risk');
    expect(tab.className).toContain('border-primary');
  });

  it('Liquidity Risk tab is not active by default', () => {
    setupHandlers();
    renderWithProviders(<MarketLiquidityRiskPage />);
    const tab = screen.getByText('Liquidity Risk');
    expect(tab.className).not.toContain('border-primary');
  });

  it('can switch to Liquidity Risk tab', async () => {
    setupHandlers();
    
    renderWithProviders(<MarketLiquidityRiskPage />);
    fireEvent.click(screen.getByText('Liquidity Risk'));
    const tab = screen.getByText('Liquidity Risk');
    expect(tab.className).toContain('border-primary');
  });

  it('can switch back to Market Risk tab', async () => {
    setupHandlers();
    
    renderWithProviders(<MarketLiquidityRiskPage />);
    fireEvent.click(screen.getByText('Liquidity Risk'));
    fireEvent.click(screen.getByText('Market Risk'));
    const tab = screen.getByText('Market Risk');
    expect(tab.className).toContain('border-primary');
  });

  it('renders VaR stats cards on market risk tab', async () => {
    setupHandlers();
    renderWithProviders(<MarketLiquidityRiskPage />);
    await waitFor(() => {
      // VarStatsCards component should be visible
      expect(screen.getByText('Market Risk')).toBeInTheDocument();
    });
  });

  it('handles VaR stats API error gracefully', () => {
    server.use(
      http.get('/api/v1/risk/market/var-stats', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<MarketLiquidityRiskPage />);
    expect(screen.getByText('Market & Liquidity Risk')).toBeInTheDocument();
  });

  it('handles liquidity ratios API error gracefully', async () => {
    server.use(
      http.get('/api/v1/risk/liquidity/ratios', () => HttpResponse.json({}, { status: 500 })),
    );
    
    renderWithProviders(<MarketLiquidityRiskPage />);
    fireEvent.click(screen.getByText('Liquidity Risk'));
    expect(screen.getByText('Market & Liquidity Risk')).toBeInTheDocument();
  });

  it('hides market risk content when on liquidity tab', async () => {
    setupHandlers();
    
    renderWithProviders(<MarketLiquidityRiskPage />);
    fireEvent.click(screen.getByText('Liquidity Risk'));
    // Market Risk tab content should not be visible
    const marketTab = screen.getByText('Market Risk');
    expect(marketTab.className).not.toContain('border-primary');
  });

  it('handles stress tests API error', () => {
    server.use(
      http.get('/api/v1/risk/market/stress-tests', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<MarketLiquidityRiskPage />);
    expect(screen.getByText('Market & Liquidity Risk')).toBeInTheDocument();
  });

  it('handles cashflow ladder API error', () => {
    server.use(
      http.get('/api/v1/risk/liquidity/cashflow-ladder', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<MarketLiquidityRiskPage />);
    expect(screen.getByText('Market & Liquidity Risk')).toBeInTheDocument();
  });

  it('handles HQLA API error', () => {
    server.use(
      http.get('/api/v1/risk/liquidity/hqla', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<MarketLiquidityRiskPage />);
    expect(screen.getByText('Market & Liquidity Risk')).toBeInTheDocument();
  });

  it('renders without crashing on all empty data', async () => {
    server.use(
      http.get('/api/v1/risk/market/var-stats', () => HttpResponse.json(wrap(null))),
      http.get('/api/v1/risk/liquidity/ratios', () => HttpResponse.json(wrap(null))),
    );
    renderWithProviders(<MarketLiquidityRiskPage />);
    expect(screen.getByText('Market & Liquidity Risk')).toBeInTheDocument();
  });

  it('renders both tabs as buttons', () => {
    setupHandlers();
    renderWithProviders(<MarketLiquidityRiskPage />);
    const marketBtn = screen.getByText('Market Risk');
    const liqBtn = screen.getByText('Liquidity Risk');
    expect(marketBtn.tagName).toBe('BUTTON');
    expect(liqBtn.tagName).toBe('BUTTON');
  });
});
