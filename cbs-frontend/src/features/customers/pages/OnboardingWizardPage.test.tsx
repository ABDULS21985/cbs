import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import OnboardingWizardPage from './OnboardingWizardPage';

const wrap = (data: unknown) => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

function renderPage(route = '/customers/onboarding') {
  return renderWithProviders(
    <Routes>
      <Route path="/customers/onboarding" element={<OnboardingWizardPage />} />
      <Route path="/customers/:id" element={<div>Customer profile</div>} />
      <Route path="/accounts/open" element={<div>Account opening</div>} />
    </Routes>,
    { route },
  );
}

describe('OnboardingWizardPage', () => {
  it('submits an individual onboarding payload with nested contact and address data', async () => {
    let postedBody: Record<string, unknown> | null = null;

    server.use(
      http.post('/api/v1/customers', async ({ request }) => {
        postedBody = (await request.json()) as Record<string, unknown>;

        return HttpResponse.json(
          wrap({
            id: 99,
            cifNumber: 'CIF0000099',
            customerType: 'INDIVIDUAL',
            status: 'ACTIVE',
            fullName: 'Ada Obi',
            email: 'ada@example.com',
            phonePrimary: '+2348012345678',
            addresses: postedBody?.addresses ?? [],
            identifications: postedBody?.identifications ?? [],
            contacts: postedBody?.contacts ?? [],
            relationships: [],
            notes: [],
          }),
          { status: 201 },
        );
      }),
    );

    renderPage();

    fireEvent.click(screen.getByText('INDIVIDUAL'));

    fireEvent.change(screen.getByLabelText('First Name *'), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText('Last Name *'), { target: { value: 'Obi' } });
    fireEvent.change(screen.getByLabelText('Date of Birth *'), { target: { value: '1990-01-15' } });
    fireEvent.change(screen.getByLabelText('Nationality *'), { target: { value: 'NGA' } });
    fireEvent.click(screen.getByText(/^Next$/));

    fireEvent.change(screen.getByLabelText('Residential Address *'), { target: { value: '10 Marina Street' } });
    fireEvent.change(screen.getByLabelText('Phone Number *'), { target: { value: '+2348012345678' } });
    fireEvent.change(screen.getByLabelText('Email Address *'), { target: { value: 'ada@example.com' } });
    fireEvent.click(screen.getByText(/^Next$/));

    fireEvent.change(screen.getByLabelText('ID Type *'), { target: { value: 'NIN' } });
    fireEvent.change(screen.getByLabelText('ID Number *'), { target: { value: '12345678901' } });
    fireEvent.click(screen.getByText(/^Next$/));

    fireEvent.click(screen.getByText('Skip'));
    fireEvent.click(screen.getByText(/^Next$/));
    fireEvent.click(screen.getByText('SAVINGS'));
    fireEvent.click(screen.getByLabelText(/i accept the terms and conditions/i));
    fireEvent.click(screen.getByText(/^Next$/));
    fireEvent.click(screen.getByText('Submit Application'));

    await waitFor(() => {
      expect(screen.getByText('Customer profile')).toBeInTheDocument();
    });

    expect(postedBody).toMatchObject({
      customerType: 'INDIVIDUAL',
      firstName: 'Ada',
      lastName: 'Obi',
      phonePrimary: '+2348012345678',
      email: 'ada@example.com',
    });
    expect(postedBody?.addresses).toEqual([
      expect.objectContaining({
        addressType: 'RESIDENTIAL',
        addressLine1: '10 Marina Street',
        isPrimary: true,
      }),
    ]);
    expect(postedBody?.contacts).toEqual([
      expect.objectContaining({
        contactType: 'PHONE',
        contactValue: '+2348012345678',
      }),
      expect.objectContaining({
        contactType: 'EMAIL',
        contactValue: 'ada@example.com',
      }),
    ]);
  });

  it('collects corporate fields and returns to account opening when requested', async () => {
    let postedBody: Record<string, unknown> | null = null;

    server.use(
      http.post('/api/v1/customers', async ({ request }) => {
        postedBody = (await request.json()) as Record<string, unknown>;

        return HttpResponse.json(
          wrap({
            id: 501,
            cifNumber: 'CIF0000501',
            customerType: 'CORPORATE',
            status: 'ACTIVE',
            fullName: 'Acme Industries Ltd',
            email: 'ops@acme.ng',
            phonePrimary: '+2348099999999',
            addresses: postedBody?.addresses ?? [],
            identifications: [],
            contacts: postedBody?.contacts ?? [],
            relationships: [],
            notes: [],
          }),
          { status: 201 },
        );
      }),
    );

    renderPage('/customers/onboarding?returnUrl=/accounts/open');

    fireEvent.click(screen.getByText('CORPORATE'));

    fireEvent.change(screen.getByLabelText('Registered Name *'), { target: { value: 'Acme Industries Ltd' } });
    fireEvent.change(screen.getByLabelText('Trading Name'), { target: { value: 'Acme' } });
    fireEvent.change(screen.getByLabelText('Registration Number'), { target: { value: 'RC-445566' } });
    fireEvent.change(screen.getByLabelText('Registration Date'), { target: { value: '2018-05-01' } });
    fireEvent.change(screen.getByLabelText('Country of Registration'), { target: { value: 'NGA' } });
    fireEvent.click(screen.getByText(/^Next$/));

    fireEvent.change(screen.getByLabelText('Residential Address *'), { target: { value: '17 Adeola Odeku' } });
    fireEvent.change(screen.getByLabelText('Phone Number *'), { target: { value: '+2348099999999' } });
    fireEvent.change(screen.getByLabelText('Email Address *'), { target: { value: 'ops@acme.ng' } });
    fireEvent.click(screen.getByText(/^Next$/));

    fireEvent.click(screen.getByText(/^Next$/));
    fireEvent.click(screen.getByText(/^Next$/));
    fireEvent.click(screen.getByText(/^Next$/));
    fireEvent.click(screen.getByText('CURRENT'));
    fireEvent.click(screen.getByLabelText(/i accept the terms and conditions/i));
    fireEvent.click(screen.getByText(/^Next$/));
    fireEvent.click(screen.getByText('Submit Application'));

    await waitFor(() => {
      expect(screen.getByText('Account opening')).toBeInTheDocument();
    });

    expect(postedBody).toMatchObject({
      customerType: 'CORPORATE',
      registeredName: 'Acme Industries Ltd',
      tradingName: 'Acme',
      registrationNumber: 'RC-445566',
      registrationDate: '2018-05-01',
      phonePrimary: '+2348099999999',
      email: 'ops@acme.ng',
    });
  });
});
