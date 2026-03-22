import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { BusinessRiskPage } from '../pages/BusinessRiskPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

function setupHandlers(assessments: unknown[] = []) {
  server.use(
    http.get('/api/v1/business-risk/domain/:domain', () => HttpResponse.json(wrap(assessments))),
    http.get('/api/v1/business-risk/rating/:rating', () => HttpResponse.json(wrap([]))),
  );
}

describe('BusinessRiskPage', () => {
  it('renders page header', () => {
    setupHandlers();
    renderWithProviders(<BusinessRiskPage />);
    expect(screen.getByText('Business Risk Assessments')).toBeInTheDocument();
  });

  it('shows New Assessment button', () => {
    setupHandlers();
    renderWithProviders(<BusinessRiskPage />);
    expect(screen.getByText('New Assessment')).toBeInTheDocument();
  });

  it('renders By Domain / By Rating toggle', () => {
    setupHandlers();
    renderWithProviders(<BusinessRiskPage />);
    expect(screen.getByText('By Domain')).toBeInTheDocument();
    expect(screen.getByText('By Rating')).toBeInTheDocument();
  });

  it('shows stat cards', async () => {
    setupHandlers();
    renderWithProviders(<BusinessRiskPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Assessments')).toBeInTheDocument();
    });
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Exceeded Appetite')).toBeInTheDocument();
    expect(screen.getByText('Avg Residual Score')).toBeInTheDocument();
  });

  it('shows empty state when no assessments', async () => {
    setupHandlers([]);
    renderWithProviders(<BusinessRiskPage />);
    await waitFor(() => {
      expect(screen.getByText('No assessments found for this filter.')).toBeInTheDocument();
    });
  });

  it('can switch between domain and rating views', () => {
    setupHandlers();
    renderWithProviders(<BusinessRiskPage />);

    const byRatingBtn = screen.getByText('By Rating');
    fireEvent.click(byRatingBtn);
    expect(byRatingBtn.className).toContain('bg-primary');

    const byDomainBtn = screen.getByText('By Domain');
    fireEvent.click(byDomainBtn);
    expect(byDomainBtn.className).toContain('bg-primary');
  });

  it('handles API errors gracefully', () => {
    server.use(
      http.get('/api/v1/business-risk/domain/:domain', () => HttpResponse.json({}, { status: 500 })),
      http.get('/api/v1/business-risk/rating/:rating', () => HttpResponse.json({}, { status: 500 })),
    );
    renderWithProviders(<BusinessRiskPage />);
    expect(screen.getByText('Business Risk Assessments')).toBeInTheDocument();
  });
});
