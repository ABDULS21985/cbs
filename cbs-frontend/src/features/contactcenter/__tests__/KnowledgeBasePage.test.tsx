import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { KnowledgeBasePage } from '../pages/KnowledgeBasePage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockArticles = [
  { id: 1, articleCode: 'HA-001', title: 'How to Block a Card', articleType: 'HOW_TO', category: 'Card Services', content: '<p>Steps to block a card</p>', summary: 'Guide for blocking cards', tags: ['cards', 'block'], productFamily: 'Cards', language: 'en', viewCount: 150, helpfulnessYes: 45, helpfulnessNo: 5, relatedArticles: {}, status: 'PUBLISHED', publishedAt: '2026-01-15T00:00:00Z' },
  { id: 2, articleCode: 'HA-002', title: 'Account Balance FAQ', articleType: 'FAQ', category: 'Account Services', content: '<p>Frequently asked questions about balances</p>', summary: 'Common balance questions', tags: ['accounts', 'balance'], productFamily: 'Accounts', language: 'en', viewCount: 300, helpfulnessYes: 90, helpfulnessNo: 10, relatedArticles: {}, status: 'PUBLISHED', publishedAt: '2026-02-01T00:00:00Z' },
  { id: 3, articleCode: 'HA-003', title: 'Draft Policy Article', articleType: 'POLICY', category: 'Compliance', content: '<p>Draft content</p>', summary: 'Under review', tags: [], productFamily: '', language: 'en', viewCount: 0, helpfulnessYes: 0, helpfulnessNo: 0, relatedArticles: {}, status: 'DRAFT', publishedAt: null },
];

const mockFlows = [
  { id: 1, flowCode: 'GF-001', flowName: 'Card Block Flow', flowType: 'TROUBLESHOOT', description: 'Guide agent through card blocking', steps: {}, decisionTree: {}, estimatedDurationMin: 3, completionRatePct: 85, totalStarts: 200, totalCompletions: 170, targetChannel: 'CHAT', status: 'ACTIVE' },
  { id: 2, flowCode: 'GF-002', flowName: 'New Customer Onboarding', flowType: 'ONBOARDING', description: 'Onboard new customer', steps: {}, decisionTree: {}, estimatedDurationMin: 10, completionRatePct: 60, totalStarts: 50, totalCompletions: 30, targetChannel: 'ALL', status: 'DRAFT' },
];

function setupHandlers() {
  server.use(
    http.get('/api/v1/help/articles/search', () => HttpResponse.json(wrap(mockArticles))),
    http.get('/api/v1/help/articles', () => HttpResponse.json(wrap(mockArticles))),
    http.get('/api/v1/help/flows', () => HttpResponse.json(wrap(mockFlows))),
    http.post('/api/v1/help/articles', () => HttpResponse.json(wrap({ ...mockArticles[0], id: 4, articleCode: 'HA-004' }))),
    http.post('/api/v1/help/articles/:code/publish', () => HttpResponse.json(wrap({ ...mockArticles[2], status: 'PUBLISHED' }))),
    http.post('/api/v1/help/articles/:code/view', () => HttpResponse.json(wrap(mockArticles[0]))),
    http.post('/api/v1/help/articles/:code/helpfulness', () => HttpResponse.json(wrap(mockArticles[0]))),
    http.post('/api/v1/help/flows', () => HttpResponse.json(wrap({ ...mockFlows[0], id: 3, flowCode: 'GF-003' }))),
    http.post('/api/v1/help/flows/:code/activate', () => HttpResponse.json(wrap({ ...mockFlows[1], status: 'ACTIVE' }))),
    http.post('/api/v1/help/flows/:code/start', () => HttpResponse.json(wrap(mockFlows[0]))),
  );
}

describe('KnowledgeBasePage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<KnowledgeBasePage />);
    expect(screen.getByText('Knowledge Base')).toBeInTheDocument();
  });

  it('renders New Article and New Flow buttons', () => {
    setupHandlers();
    renderWithProviders(<KnowledgeBasePage />);
    expect(screen.getByText('New Article')).toBeInTheDocument();
    expect(screen.getByText('New Flow')).toBeInTheDocument();
  });

  it('renders 3 tabs: Browse, Article Management, Guided Flows', () => {
    setupHandlers();
    renderWithProviders(<KnowledgeBasePage />);
    expect(screen.getByText('Browse')).toBeInTheDocument();
    expect(screen.getByText('Article Management')).toBeInTheDocument();
    expect(screen.getByText('Guided Flows')).toBeInTheDocument();
  });

  it('renders category grid on browse tab', async () => {
    setupHandlers();
    renderWithProviders(<KnowledgeBasePage />);
    await waitFor(() => {
      expect(screen.getByText('Account Services')).toBeInTheDocument();
    });
    expect(screen.getByText('Card Services')).toBeInTheDocument();
    expect(screen.getByText('Lending')).toBeInTheDocument();
    expect(screen.getByText('Payments')).toBeInTheDocument();
  });

  it('renders search input', () => {
    setupHandlers();
    renderWithProviders(<KnowledgeBasePage />);
    expect(screen.getByPlaceholderText(/search articles/i)).toBeInTheDocument();
  });

  it('displays articles in management tab', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<KnowledgeBasePage />);
    await user.click(screen.getByText('Article Management'));
    await waitFor(() => {
      expect(screen.getByText('How to Block a Card')).toBeInTheDocument();
    });
    expect(screen.getByText('Account Balance FAQ')).toBeInTheDocument();
  });

  it('shows Publish action for draft articles', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<KnowledgeBasePage />);
    await user.click(screen.getByText('Article Management'));
    await waitFor(() => {
      expect(screen.getByText('Publish')).toBeInTheDocument();
    });
  });

  it('displays guided flows in flows tab', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<KnowledgeBasePage />);
    await user.click(screen.getByText('Guided Flows'));
    await waitFor(() => {
      expect(screen.getByText('Card Block Flow')).toBeInTheDocument();
    });
    expect(screen.getByText('New Customer Onboarding')).toBeInTheDocument();
  });

  it('shows Activate button for non-active flows', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<KnowledgeBasePage />);
    await user.click(screen.getByText('Guided Flows'));
    await waitFor(() => {
      expect(screen.getByText('Activate')).toBeInTheDocument();
    });
  });

  it('shows Test button for flows', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<KnowledgeBasePage />);
    await user.click(screen.getByText('Guided Flows'));
    await waitFor(() => {
      const testBtns = screen.getAllByText('Test');
      expect(testBtns.length).toBe(2);
    });
  });

  it('opens create article dialog', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<KnowledgeBasePage />);
    await user.click(screen.getByText('New Article'));
    await waitFor(() => {
      expect(screen.getByText('Create Article')).toBeInTheDocument();
    });
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('opens create flow dialog', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<KnowledgeBasePage />);
    await user.click(screen.getByText('New Flow'));
    await waitFor(() => {
      expect(screen.getByText('Create Guided Flow')).toBeInTheDocument();
    });
    expect(screen.getByText('Flow Name')).toBeInTheDocument();
  });
});
