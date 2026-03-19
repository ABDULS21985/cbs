import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { ComplianceDashboardPage } from './ComplianceDashboardPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockStats = {
  activeAssessments: 5,
  openGaps: 45,
  criticalGaps: 8,
  overdueRemediations: 12,
  complianceScore: 78,
};

function setupHandlers(stats = mockStats) {
  server.use(
    http.get('/api/v1/compliance/stats', () => HttpResponse.json(wrap(stats))),
    http.get('/api/v1/compliance/assessments', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/compliance/gaps', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/compliance/policies', () => HttpResponse.json(wrap([]))),
    http.get('/api/v1/compliance/audit-findings', () => HttpResponse.json(wrap([]))),
  );
}

describe('ComplianceDashboardPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<ComplianceDashboardPage />);
    expect(screen.getByText('Compliance & Governance')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    setupHandlers();
    renderWithProviders(<ComplianceDashboardPage />);
    expect(screen.getByText(/assessments.*gap tracking.*policy/i)).toBeInTheDocument();
  });

  it('renders 5 stat cards', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('Active Assessments')).toBeInTheDocument();
    });
    expect(screen.getByText('Open Gaps')).toBeInTheDocument();
    expect(screen.getByText('Critical Gaps')).toBeInTheDocument();
    expect(screen.getByText('Overdue Remediations')).toBeInTheDocument();
    expect(screen.getByText('Compliance Score')).toBeInTheDocument();
  });

  it('displays stat values', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
  });

  it('renders 5 tabs', () => {
    setupHandlers();
    renderWithProviders(<ComplianceDashboardPage />);
    expect(screen.getByText('Assessments')).toBeInTheDocument();
    expect(screen.getByText('Gap Register')).toBeInTheDocument();
    expect(screen.getByText('Remediation')).toBeInTheDocument();
    expect(screen.getByText('Policy Library')).toBeInTheDocument();
    expect(screen.getByText('Audit Findings')).toBeInTheDocument();
  });

  it('Assessments tab is active by default', () => {
    setupHandlers();
    renderWithProviders(<ComplianceDashboardPage />);
    const tab = screen.getByText('Assessments');
    expect(tab.className).toContain('border-primary');
  });

  it('can switch to Gap Register tab', async () => {
    setupHandlers();
    
    renderWithProviders(<ComplianceDashboardPage />);
    fireEvent.click(screen.getByText('Gap Register'));
    const tab = screen.getByText('Gap Register');
    expect(tab.className).toContain('border-primary');
  });

  it('can switch to Remediation tab', async () => {
    setupHandlers();
    
    renderWithProviders(<ComplianceDashboardPage />);
    fireEvent.click(screen.getByText('Remediation'));
    const tab = screen.getByText('Remediation');
    expect(tab.className).toContain('border-primary');
  });

  it('can switch to Policy Library tab', async () => {
    setupHandlers();
    
    renderWithProviders(<ComplianceDashboardPage />);
    fireEvent.click(screen.getByText('Policy Library'));
    const tab = screen.getByText('Policy Library');
    expect(tab.className).toContain('border-primary');
  });

  it('can switch to Audit Findings tab', async () => {
    setupHandlers();
    
    renderWithProviders(<ComplianceDashboardPage />);
    fireEvent.click(screen.getByText('Audit Findings'));
    const tab = screen.getByText('Audit Findings');
    expect(tab.className).toContain('border-primary');
  });

  it('shows No assessments on Assessments tab when empty', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceDashboardPage />);
    await waitFor(() => {
      expect(screen.getByText('No assessments')).toBeInTheDocument();
    });
  });

  it('shows No audit findings on Audit Findings tab when empty', async () => {
    setupHandlers();
    
    renderWithProviders(<ComplianceDashboardPage />);
    fireEvent.click(screen.getByText('Audit Findings'));
    await waitFor(() => {
      expect(screen.getByText('No audit findings')).toBeInTheDocument();
    });
  });

  it('handles stats API error gracefully', () => {
    server.use(
      http.get('/api/v1/compliance/stats', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<ComplianceDashboardPage />);
    expect(screen.getByText('Compliance & Governance')).toBeInTheDocument();
  });

  it('does not show stat cards when stats are loading', () => {
    server.use(
      http.get('/api/v1/compliance/stats', () => new Promise(() => {})),
    );
    renderWithProviders(<ComplianceDashboardPage />);
    expect(screen.queryByText('Active Assessments')).not.toBeInTheDocument();
  });

  it('highlights critical gaps in red', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceDashboardPage />);
    await waitFor(() => {
      const criticalValue = screen.getByText('8');
      expect(criticalValue.className).toContain('text-red-600');
    });
  });

  it('highlights overdue remediations in red', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceDashboardPage />);
    await waitFor(() => {
      const overdueValue = screen.getByText('12');
      expect(overdueValue.className).toContain('text-red-600');
    });
  });

  it('does not highlight score in red when >= 80', async () => {
    setupHandlers({ ...mockStats, complianceScore: 85 });
    renderWithProviders(<ComplianceDashboardPage />);
    await waitFor(() => {
      const scoreValue = screen.getByText('85%');
      expect(scoreValue.className).toContain('text-green-600');
    });
  });

  it('renders tabs as buttons', () => {
    setupHandlers();
    renderWithProviders(<ComplianceDashboardPage />);
    const assessmentsTab = screen.getByText('Assessments');
    expect(assessmentsTab.tagName).toBe('BUTTON');
  });

  it('renders stat cards in a grid', async () => {
    setupHandlers();
    renderWithProviders(<ComplianceDashboardPage />);
    await waitFor(() => {
      const statCards = document.querySelectorAll('.stat-card');
      expect(statCards.length).toBe(5);
    });
  });
});
