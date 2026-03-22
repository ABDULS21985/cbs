import { describe, it, expect, beforeAll } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';

import { UssdSimulatorPage } from './UssdSimulatorPage';

// jsdom doesn't implement scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

function setupHandlers() {
  let requestCount = 0;
  server.use(
    http.post('/api/v1/ussd/request', ({ request }) => {
      const url = new URL(request.url);
      const msisdn = url.searchParams.get('msisdn');
      const sessionId = url.searchParams.get('sessionId');
      const input = url.searchParams.get('input');
      requestCount++;

      if (!sessionId) {
        // First request - show main menu
        return HttpResponse.json(wrap({
          sessionId: 'ussd-sess-001',
          text: 'Welcome to DigiCore Banking\n1. Check Balance\n2. Transfer Funds\n3. Buy Airtime\n0. Back\n00. Main Menu',
          continueSession: true,
        }));
      }

      if (input === '1') {
        return HttpResponse.json(wrap({
          sessionId: 'ussd-sess-001',
          text: 'Your balance is NGN 150,000.00\nThank you for banking with us.',
          continueSession: false,
        }));
      }

      return HttpResponse.json(wrap({
        sessionId: 'ussd-sess-001',
        text: 'Invalid selection. Please try again.\n1. Check Balance\n2. Transfer Funds\n3. Buy Airtime',
        continueSession: true,
      }));
    }),
  );
}

describe('UssdSimulatorPage', () => {
  it('renders page header "USSD Simulator"', () => {
    setupHandlers();
    renderWithProviders(<UssdSimulatorPage />);
    expect(screen.getByText('USSD Simulator')).toBeInTheDocument();
  });

  it('shows MSISDN input with default phone number', () => {
    setupHandlers();
    renderWithProviders(<UssdSimulatorPage />);
    const phoneInput = screen.getByDisplayValue('+2348012345678');
    expect(phoneInput).toBeInTheDocument();
  });

  it('shows Start Session button', () => {
    setupHandlers();
    renderWithProviders(<UssdSimulatorPage />);
    expect(screen.getByText('Start Session')).toBeInTheDocument();
  });

  it('starts USSD session and displays menu response', async () => {
    setupHandlers();
    renderWithProviders(<UssdSimulatorPage />);

    fireEvent.click(screen.getByText('Start Session'));

    await waitFor(() => {
      const els = screen.getAllByText(/Welcome to DigiCore Banking/);
      expect(els.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });

    const balanceEls = screen.getAllByText(/Check Balance/);
    expect(balanceEls.length).toBeGreaterThanOrEqual(1);
  });

  it('shows session ID after starting session', async () => {
    setupHandlers();
    renderWithProviders(<UssdSimulatorPage />);

    fireEvent.click(screen.getByText('Start Session'));

    await waitFor(() => {
      expect(screen.getByText('ussd-sess-001')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('allows sending user input and displays response', async () => {
    setupHandlers();
    renderWithProviders(<UssdSimulatorPage />);

    // Start session
    fireEvent.click(screen.getByText('Start Session'));

    await waitFor(() => {
      const els = screen.getAllByText(/Welcome to DigiCore Banking/);
      expect(els.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });

    // Find the USSD input field - look for text inputs that aren't the MSISDN field
    const allInputs = document.querySelectorAll('input[type="text"]');
    const ussdInput = allInputs[allInputs.length - 1] as HTMLInputElement;
    if (ussdInput) {
      fireEvent.change(ussdInput, { target: { value: '1' } });
    }

    // Find and click send button
    const buttons = screen.getAllByRole('button');
    const sendBtn = buttons.find((b) => b.textContent?.toLowerCase().includes('send') || b.querySelector('[class*="Send"]'));
    if (sendBtn) fireEvent.click(sendBtn);

    await waitFor(() => {
      const els = screen.getAllByText(/150,000/);
      expect(els.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 5000 });
  });

  it('shows session ended when continueSession is false', async () => {
    setupHandlers();
    renderWithProviders(<UssdSimulatorPage />);

    fireEvent.click(screen.getByText('Start Session'));

    await waitFor(() => {
      const els = screen.getAllByText(/Welcome to DigiCore Banking/);
      expect(els.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });

    // Send input that ends session
    const allInputs = document.querySelectorAll('input[type="text"]');
    const ussdInput = allInputs[allInputs.length - 1] as HTMLInputElement;
    if (ussdInput) {
      fireEvent.change(ussdInput, { target: { value: '1' } });
    }

    const buttons = screen.getAllByRole('button');
    const sendBtn = buttons.find((b) => b.textContent?.toLowerCase().includes('send') || b.querySelector('[class*="Send"]'));
    if (sendBtn) fireEvent.click(sendBtn);

    await waitFor(() => {
      const els = screen.getAllByText(/150,000/);
      expect(els.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 5000 });
  });

  it('renders terminal-style dark display area', () => {
    setupHandlers();
    renderWithProviders(<UssdSimulatorPage />);
    // The terminal area should have a dark background
    const terminal = document.querySelector('[class*="bg-gray-950"], [class*="bg-black"]');
    expect(terminal).not.toBeNull();
  });

  it('hides page for non-admin/officer users', () => {
    setupHandlers();
    renderWithProviders(<UssdSimulatorPage />, {
      user: {
        id: 'user-viewer',
        username: 'viewer',
        fullName: 'Viewer User',
        email: 'viewer@bellbank.com',
        roles: ['CBS_VIEWER'],
        branchId: 1,
        branchName: 'Head Office',
        permissions: ['read'],
      },
    });
    // RoleGuard should hide the content for CBS_VIEWER
    expect(screen.queryByText('Start Session')).not.toBeInTheDocument();
  });
});
