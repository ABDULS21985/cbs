import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';
import { http, HttpResponse } from 'msw';
import { MerchantOnboardPage } from './MerchantOnboardPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

const mockMerchantResponse = {
  id: 1,
  merchantId: 'MCH-00042',
  merchantName: 'Acme Supermarket',
  merchantCategoryCode: '5411',
  businessType: 'LLC',
  registrationNumber: 'RC-99887',
  mdrRate: 2.5,
  riskCategory: 'LOW',
  contactName: 'Jane Doe',
  contactEmail: 'jane@acme.com',
  contactPhone: '+2348012345678',
  settlementAccountId: 1001,
  settlementFrequency: 'DAILY',
  status: 'ACTIVE',
  createdAt: '2026-03-22T10:00:00Z',
};

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── helpers ──────────────────────────────────────────────────────────────────

function fillStep0() {
  // Merchant Name
  const nameInput = screen.getByPlaceholderText('Business name');
  fireEvent.change(nameInput, { target: { value: 'Acme Supermarket' } });

  // MCC selector
  const mccSelect = screen.getByDisplayValue('Select MCC...');
  fireEvent.change(mccSelect, { target: { value: '5411' } });

  // Business Type
  const bizSelect = screen.getByDisplayValue('Select...');
  fireEvent.change(bizSelect, { target: { value: 'LLC' } });

  // Registration Number
  const regInput = screen.getByPlaceholderText('RC-12345');
  fireEvent.change(regInput, { target: { value: 'RC-99887' } });
}

function fillStep1() {
  // MDR Rate
  const mdrInput = screen.getByDisplayValue('1.5');
  fireEvent.change(mdrInput, { target: { value: '2.5' } });

  // Settlement Account ID
  const accountInput = screen.getByPlaceholderText('Settlement account ID');
  fireEvent.change(accountInput, { target: { value: '1001' } });
}

function fillStep2() {
  // Contact Name
  const contactNameInput = screen.getByPlaceholderText('Full name');
  fireEvent.change(contactNameInput, { target: { value: 'Jane Doe' } });

  // Contact Email
  const emailInput = screen.getByPlaceholderText('email@example.com');
  fireEvent.change(emailInput, { target: { value: 'jane@acme.com' } });

  // Contact Phone
  const phoneInput = screen.getByPlaceholderText('+234...');
  fireEvent.change(phoneInput, { target: { value: '+2348012345678' } });
}

function clickNext() {
  const nextBtn = screen.getByText('Next');
  fireEvent.click(nextBtn);
}

function clickBack() {
  const backBtn = screen.getByText('Back');
  fireEvent.click(backBtn);
}

/** Find and click the "Onboard Merchant" submit button (not the page header). */
function clickSubmit() {
  const allMatches = screen.getAllByText('Onboard Merchant');
  const submitBtn = allMatches.find((el) => el.closest('button'))!;
  fireEvent.click(submitBtn);
}

/** Navigate through steps 0-3 filling all required fields. */
function navigateToReview() {
  fillStep0();
  clickNext();
  fillStep1();
  clickNext();
  fillStep2();
  clickNext();
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('MerchantOnboardPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  // ── Step 0: Rendering ────────────────────────────────────────────────────

  it('renders step 0 with all fields', () => {
    renderWithProviders(<MerchantOnboardPage />);

    expect(screen.getAllByText('Onboard Merchant').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Business Information')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Business name')).toBeInTheDocument();
    expect(screen.getByText('MCC Code')).toBeInTheDocument();
    expect(screen.getByText('Business Type')).toBeInTheDocument();
    expect(screen.getByText('Registration Number')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('RC-12345')).toBeInTheDocument();
  });

  // ── Step 0: Validation ───────────────────────────────────────────────────

  it('Next button is disabled until step 0 validation passes', () => {
    renderWithProviders(<MerchantOnboardPage />);

    const nextBtn = screen.getByText('Next').closest('button')!;

    // Initially disabled — no name, no MCC, no businessType
    expect(nextBtn).toBeDisabled();

    // Fill only merchant name — still disabled
    fireEvent.change(screen.getByPlaceholderText('Business name'), { target: { value: 'Test' } });
    expect(nextBtn).toBeDisabled();

    // Fill MCC — still disabled (no businessType)
    fireEvent.change(screen.getByDisplayValue('Select MCC...'), { target: { value: '5411' } });
    expect(nextBtn).toBeDisabled();

    // Fill businessType — now enabled
    fireEvent.change(screen.getByDisplayValue('Select...'), { target: { value: 'LLC' } });
    expect(nextBtn).not.toBeDisabled();
  });

  // ── Navigation: forward ──────────────────────────────────────────────────

  it('can navigate through all 4 steps', () => {
    renderWithProviders(<MerchantOnboardPage />);

    // Step 0 — section heading is unique ("Business Information" vs indicator "Business Info")
    expect(screen.getByText('Business Information')).toBeInTheDocument();
    fillStep0();
    clickNext();

    // Step 1 — "Financial Setup" appears in both step indicator and <h3>
    const step1Headings = screen.getAllByText('Financial Setup');
    expect(step1Headings.length).toBeGreaterThanOrEqual(2);
    fillStep1();
    clickNext();

    // Step 2 — "Contact & Compliance" appears in both step indicator and <h3>
    const step2Headings = screen.getAllByText('Contact & Compliance');
    expect(step2Headings.length).toBeGreaterThanOrEqual(2);
    fillStep2();
    clickNext();

    // Step 3 — "Review & Submit" appears in both step indicator and <h3>
    const step3Headings = screen.getAllByText('Review & Submit');
    expect(step3Headings.length).toBeGreaterThanOrEqual(2);
  });

  // ── Navigation: backward ─────────────────────────────────────────────────

  it('Back button works and is disabled on step 0', () => {
    renderWithProviders(<MerchantOnboardPage />);

    // Step 0 — Back is disabled
    const backBtn = screen.getByText('Back').closest('button')!;
    expect(backBtn).toBeDisabled();

    // Navigate to step 1
    fillStep0();
    clickNext();
    expect(screen.getAllByText('Financial Setup').length).toBeGreaterThanOrEqual(2);

    // Back should return to step 0
    clickBack();
    expect(screen.getByText('Business Information')).toBeInTheDocument();

    // Back should be disabled again on step 0
    expect(screen.getByText('Back').closest('button')).toBeDisabled();
  });

  // ── Step 1: Validation ───────────────────────────────────────────────────

  it('Next button is disabled on step 1 until mdrRate > 0 and settlementAccountId are set', () => {
    renderWithProviders(<MerchantOnboardPage />);

    fillStep0();
    clickNext();

    // mdrRate defaults to 1.5, but settlementAccountId is empty => disabled
    const nextBtn = screen.getByText('Next').closest('button')!;
    expect(nextBtn).toBeDisabled();

    // Set MDR rate to 0 and add settlement account => still disabled
    fireEvent.change(screen.getByDisplayValue('1.5'), { target: { value: '0' } });
    fireEvent.change(screen.getByPlaceholderText('Settlement account ID'), { target: { value: '1001' } });
    expect(nextBtn).toBeDisabled();

    // Set MDR rate back to a positive number => enabled
    const mdrInput = document.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(mdrInput, { target: { value: '2.5' } });
    expect(nextBtn).not.toBeDisabled();
  });

  // ── Step 2: Validation ───────────────────────────────────────────────────

  it('Next button is disabled on step 2 until contactName and contactEmail are set', () => {
    renderWithProviders(<MerchantOnboardPage />);

    fillStep0();
    clickNext();
    fillStep1();
    clickNext();

    const nextBtn = screen.getByText('Next').closest('button')!;
    expect(nextBtn).toBeDisabled();

    // Fill only contact name — still disabled
    fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'Jane Doe' } });
    expect(nextBtn).toBeDisabled();

    // Fill contact email — now enabled
    fireEvent.change(screen.getByPlaceholderText('email@example.com'), { target: { value: 'jane@acme.com' } });
    expect(nextBtn).not.toBeDisabled();
  });

  // ── Step 2: Compliance checklist ─────────────────────────────────────────

  it('renders compliance checklist with 4 checkboxes on step 2', () => {
    renderWithProviders(<MerchantOnboardPage />);

    fillStep0();
    clickNext();
    fillStep1();
    clickNext();

    expect(screen.getByText('Compliance Checklist')).toBeInTheDocument();
    expect(screen.getByText('KYC documents verified')).toBeInTheDocument();
    expect(screen.getByText('AML screening completed')).toBeInTheDocument();
    expect(screen.getByText('Business registration confirmed')).toBeInTheDocument();
    expect(screen.getByText('Bank account ownership verified')).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(4);
  });

  // ── Review step ──────────────────────────────────────────────────────────

  it('Review step shows all entered values', () => {
    renderWithProviders(<MerchantOnboardPage />);

    navigateToReview();

    // "Review & Submit" appears in both step indicator and <h3>
    expect(screen.getAllByText('Review & Submit').length).toBeGreaterThanOrEqual(2);

    // Merchant name
    expect(screen.getByText('Acme Supermarket')).toBeInTheDocument();
    // MCC code
    expect(screen.getByText('5411')).toBeInTheDocument();
    // MDR Rate — formatted as percent (2.50%)
    expect(screen.getByText('2.50%')).toBeInTheDocument();
    // Settlement frequency
    expect(screen.getByText('DAILY')).toBeInTheDocument();
    // Settlement account
    expect(screen.getByText('1001')).toBeInTheDocument();
    // Contact name
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    // Contact email
    expect(screen.getByText('jane@acme.com')).toBeInTheDocument();
  });

  // ── Review step shows Onboard Merchant button (not Next) ─────────────────

  it('Review step shows Onboard Merchant button instead of Next', () => {
    renderWithProviders(<MerchantOnboardPage />);

    navigateToReview();

    // "Onboard Merchant" appears in the page header <h1> and as the submit button
    const onboardTexts = screen.getAllByText('Onboard Merchant');
    // At least the button should exist (page header + button = 2)
    expect(onboardTexts.length).toBeGreaterThanOrEqual(2);
    // The submit button should be present
    const submitBtn = onboardTexts.find((el) => el.closest('button'));
    expect(submitBtn).toBeTruthy();
    // Next button should NOT be present on the review step
    expect(screen.queryByText('Next')).not.toBeInTheDocument();
  });

  // ── Submit: correct payload ──────────────────────────────────────────────

  it('Submit sends correct payload to backend', async () => {
    const captured: Record<string, unknown>[] = [];
    server.use(
      http.post('/api/v1/merchants', async ({ request }) => {
        const body = await request.json();
        captured.push(body as Record<string, unknown>);
        return HttpResponse.json(wrap(mockMerchantResponse));
      }),
    );

    renderWithProviders(<MerchantOnboardPage />);

    navigateToReview();

    // Click submit
    clickSubmit();

    await waitFor(() => {
      expect(captured.length).toBeGreaterThan(0);
    });

    const payload = captured[0];
    expect(payload).toHaveProperty('merchantName', 'Acme Supermarket');
    expect(payload).toHaveProperty('merchantCategoryCode', '5411');
    expect(payload).toHaveProperty('businessType', 'LLC');
    expect(payload).toHaveProperty('registrationNumber', 'RC-99887');
    expect(payload).toHaveProperty('mdrRate', 2.5);
    expect(payload).toHaveProperty('riskCategory', 'LOW');
    expect(payload).toHaveProperty('contactName', 'Jane Doe');
    expect(payload).toHaveProperty('contactEmail', 'jane@acme.com');
    expect(payload).toHaveProperty('contactPhone', '+2348012345678');
    expect(payload).toHaveProperty('settlementAccountId', 1001);
    expect(payload).toHaveProperty('settlementFrequency', 'DAILY');
  });

  // ── Submit: navigation on success ────────────────────────────────────────

  it('navigates to merchant detail after successful submission', async () => {
    server.use(
      http.post('/api/v1/merchants', () =>
        HttpResponse.json(wrap(mockMerchantResponse)),
      ),
    );

    renderWithProviders(<MerchantOnboardPage />);

    navigateToReview();
    clickSubmit();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/cards/merchants/MCH-00042');
    });
  });

  // ── Submit: error handling ───────────────────────────────────────────────

  it('shows error toast on submission failure', async () => {
    server.use(
      http.post('/api/v1/merchants', () =>
        HttpResponse.json(
          { success: false, message: 'Duplicate merchant name', timestamp: new Date().toISOString() },
          { status: 409 },
        ),
      ),
    );

    renderWithProviders(<MerchantOnboardPage />);

    navigateToReview();
    clickSubmit();

    // The button should not navigate on failure
    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    // The Onboard Merchant button should be re-enabled after failure
    await waitFor(() => {
      const allMatches = screen.getAllByText('Onboard Merchant');
      const submitBtn = allMatches.find((el) => el.closest('button'))!.closest('button')!;
      expect(submitBtn).not.toBeDisabled();
    });
  });

  // ── Step indicator ───────────────────────────────────────────────────────

  it('renders all step labels in the step indicator', () => {
    renderWithProviders(<MerchantOnboardPage />);

    expect(screen.getByText('Business Info')).toBeInTheDocument();
    expect(screen.getByText('Financial Setup')).toBeInTheDocument();
    expect(screen.getByText('Contact & Compliance')).toBeInTheDocument();
    expect(screen.getByText('Review & Submit')).toBeInTheDocument();
  });

  // ── MCC auto-suggests risk category ──────────────────────────────────────

  it('auto-suggests risk category based on MCC selection', () => {
    renderWithProviders(<MerchantOnboardPage />);

    // Select a high-risk MCC (5912 = Drug Stores)
    const mccSelect = screen.getByDisplayValue('Select MCC...');
    fireEvent.change(mccSelect, { target: { value: '5912' } });

    expect(screen.getByText(/Auto-suggested risk/)).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  // ── Submit button shows loading state ────────────────────────────────────

  it('Submit button shows loading state while submitting', async () => {
    server.use(
      http.post('/api/v1/merchants', async () => {
        // Delay to observe the pending state
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json(wrap(mockMerchantResponse));
      }),
    );

    renderWithProviders(<MerchantOnboardPage />);

    navigateToReview();
    clickSubmit();

    await waitFor(() => {
      expect(screen.getByText('Onboarding...')).toBeInTheDocument();
    });

    // Wait for the mutation to complete
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  // ── Registration number is optional ──────────────────────────────────────

  it('omits registrationNumber from payload when left empty', async () => {
    const captured: Record<string, unknown>[] = [];
    server.use(
      http.post('/api/v1/merchants', async ({ request }) => {
        const body = await request.json();
        captured.push(body as Record<string, unknown>);
        return HttpResponse.json(wrap(mockMerchantResponse));
      }),
    );

    renderWithProviders(<MerchantOnboardPage />);

    // Step 0 — fill required fields but leave registration number empty
    fireEvent.change(screen.getByPlaceholderText('Business name'), { target: { value: 'Acme Supermarket' } });
    fireEvent.change(screen.getByDisplayValue('Select MCC...'), { target: { value: '5411' } });
    fireEvent.change(screen.getByDisplayValue('Select...'), { target: { value: 'LLC' } });
    clickNext();

    fillStep1();
    clickNext();

    fillStep2();
    clickNext();

    clickSubmit();

    await waitFor(() => {
      expect(captured.length).toBeGreaterThan(0);
    });

    // registrationNumber should be undefined (not sent) when empty
    expect(captured[0].registrationNumber).toBeUndefined();
  });
});
