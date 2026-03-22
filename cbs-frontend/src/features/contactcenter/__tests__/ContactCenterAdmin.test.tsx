import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { ContactCenterAdminPage } from '../pages/ContactCenterAdminPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockCenters = [
  { id: 1, centerCode: 'CC-001', centerName: 'Lagos Main', centerType: 'BLENDED', timezone: 'Africa/Lagos', operatingHours: {}, totalAgents: 50, activeAgents: 35, queueCapacity: 100, avgWaitTimeSec: 30, avgHandleTimeSec: 240, serviceLevelTarget: 80, currentServiceLevel: 85.5, isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 2, centerCode: 'CC-002', centerName: 'Abuja Support', centerType: 'INBOUND', timezone: 'Africa/Lagos', operatingHours: {}, totalAgents: 20, activeAgents: 15, queueCapacity: 50, avgWaitTimeSec: 45, avgHandleTimeSec: 300, serviceLevelTarget: 80, currentServiceLevel: 72.3, isActive: true, createdAt: '2026-02-01T00:00:00Z' },
];

function setupHandlers(centers = mockCenters) {
  server.use(
    http.get('/api/v1/contact-center', () => HttpResponse.json(wrap(centers))),
    http.post('/api/v1/contact-center', () => HttpResponse.json(wrap({ ...centers[0], id: 3, centerCode: 'CC-003' }))),
    http.put('/api/v1/contact-center/:id', () => HttpResponse.json(wrap({ ...centers[0], centerName: 'Updated' }))),
    http.post('/api/v1/contact-center/:id/deactivate', () => HttpResponse.json(wrap({ ...centers[0], isActive: false }))),
  );
}

describe('ContactCenterAdminPage', () => {
  it('renders the page header', () => {
    setupHandlers();
    renderWithProviders(<ContactCenterAdminPage />);
    expect(screen.getByText('Center Administration')).toBeInTheDocument();
  });

  it('renders New Center button', () => {
    setupHandlers();
    renderWithProviders(<ContactCenterAdminPage />);
    expect(screen.getByText('New Center')).toBeInTheDocument();
  });

  it('displays stat cards', async () => {
    setupHandlers();
    renderWithProviders(<ContactCenterAdminPage />);
    await waitFor(() => {
      expect(screen.getByText('Total Centers')).toBeInTheDocument();
    });
    expect(screen.getByText('Active Centers')).toBeInTheDocument();
    expect(screen.getByText('Total Agents')).toBeInTheDocument();
    expect(screen.getByText('Avg Service Level')).toBeInTheDocument();
  });

  it('displays center cards with correct data', async () => {
    setupHandlers();
    renderWithProviders(<ContactCenterAdminPage />);
    await waitFor(() => {
      expect(screen.getByText('Lagos Main')).toBeInTheDocument();
    });
    expect(screen.getByText('CC-001')).toBeInTheDocument();
    expect(screen.getByText('Abuja Support')).toBeInTheDocument();
    expect(screen.getByText('CC-002')).toBeInTheDocument();
  });

  it('displays center type badges', async () => {
    setupHandlers();
    renderWithProviders(<ContactCenterAdminPage />);
    await waitFor(() => {
      expect(screen.getByText('BLENDED')).toBeInTheDocument();
    });
    expect(screen.getByText('INBOUND')).toBeInTheDocument();
  });

  it('displays edit and deactivate buttons per center', async () => {
    setupHandlers();
    renderWithProviders(<ContactCenterAdminPage />);
    await waitFor(() => {
      expect(screen.getAllByText('Edit').length).toBe(2);
    });
    expect(screen.getAllByText('Deactivate').length).toBe(2);
  });

  it('shows empty state when no centers exist', async () => {
    setupHandlers([]);
    renderWithProviders(<ContactCenterAdminPage />);
    await waitFor(() => {
      expect(screen.getByText('No contact centers configured')).toBeInTheDocument();
    });
  });

  it('opens create center dialog', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<ContactCenterAdminPage />);
    await user.click(screen.getByText('New Center'));
    await waitFor(() => {
      expect(screen.getByText('New Contact Center')).toBeInTheDocument();
    });
    expect(screen.getByText('Center Code')).toBeInTheDocument();
    expect(screen.getByText('Center Name')).toBeInTheDocument();
  });

  it('opens edit dialog when clicking Edit', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<ContactCenterAdminPage />);
    await waitFor(() => {
      expect(screen.getByText('Lagos Main')).toBeInTheDocument();
    });
    const editButtons = screen.getAllByText('Edit');
    await user.click(editButtons[0]);
    await waitFor(() => {
      expect(screen.getByText('Edit Center')).toBeInTheDocument();
    });
  });

  it('shows deactivation confirmation dialog', async () => {
    setupHandlers();
    const user = userEvent.setup();
    renderWithProviders(<ContactCenterAdminPage />);
    await waitFor(() => {
      expect(screen.getByText('Lagos Main')).toBeInTheDocument();
    });
    const deactivateButtons = screen.getAllByText('Deactivate');
    await user.click(deactivateButtons[0]);
    await waitFor(() => {
      expect(screen.getByText(/Are you sure you want to deactivate/)).toBeInTheDocument();
    });
  });

  it('shows SLA indicator color based on target', async () => {
    setupHandlers();
    renderWithProviders(<ContactCenterAdminPage />);
    await waitFor(() => {
      expect(screen.getByText('85.5%')).toBeInTheDocument();
    });
    expect(screen.getByText('72.3%')).toBeInTheDocument();
  });
});
