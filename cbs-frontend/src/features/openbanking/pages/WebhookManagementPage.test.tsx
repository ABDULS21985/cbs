import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { renderWithProviders } from '@/test/helpers/renderWithProviders';
import { server } from '@/test/msw/server';

import { WebhookManagementPage } from './WebhookManagementPage';

const wrap = (data: unknown) => ({ success: true, data, timestamp: new Date().toISOString() });

describe('WebhookManagementPage', () => {
  it('opens the register sheet and creates a webhook', async () => {
    let createdPayload: Record<string, unknown> | null = null;
    let webhooks = [
      {
        id: 7,
        webhookId: 'WHK-001',
        url: 'https://partner.example.com/webhooks/payments',
        events: ['payment.completed', 'account.updated'],
        tppClientId: 91,
        tppClientName: 'FinFlow',
        authType: 'HMAC',
        secretHash: null,
        status: 'ACTIVE',
        successRate: 98.5,
        totalDeliveries: 12,
        failedDeliveries: 1,
        lastDeliveredAt: '2026-03-23T08:00:00Z',
        createdAt: '2026-03-01T08:00:00Z',
        updatedAt: '2026-03-23T08:00:00Z',
      },
    ];

    server.use(
      http.get('/api/v1/marketplace/webhooks', () => HttpResponse.json(wrap(webhooks))),
      http.post('/api/v1/marketplace/webhooks', async ({ request }) => {
        createdPayload = (await request.json()) as Record<string, unknown>;
        const created = {
          id: 8,
          webhookId: 'WHK-002',
          url: createdPayload.url as string,
          events: createdPayload.events as string[],
          tppClientId: 91,
          tppClientName: 'FinFlow',
          authType: createdPayload.authType as string,
          secretHash: createdPayload.secretHash as string | null,
          status: 'ACTIVE',
          successRate: 100,
          totalDeliveries: 0,
          failedDeliveries: 0,
          lastDeliveredAt: null,
          createdAt: '2026-03-23T10:00:00Z',
          updatedAt: '2026-03-23T10:00:00Z',
        };
        webhooks = [...webhooks, created];
        return HttpResponse.json(wrap(created));
      }),
    );

    renderWithProviders(<WebhookManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Operate webhook endpoints from one surface')).toBeInTheDocument();
    });

    screen.getByRole('button', { name: 'Register Webhook' }).click();

    const dialog = screen.getByRole('dialog', { name: 'Register Webhook' });
    expect(dialog).toBeInTheDocument();

    fireEvent.change(within(dialog).getByPlaceholderText('https://api.example.com/webhooks'), {
      target: { value: 'https://partner.example.com/webhooks/accounts' },
    });
    within(dialog).getByLabelText(/Payment Completed/).click();
    within(dialog).getByRole('button', { name: 'Register Webhook' }).click();

    await waitFor(() => {
      expect(createdPayload).toMatchObject({
        url: 'https://partner.example.com/webhooks/accounts',
        authType: 'NONE',
        events: ['payment.completed'],
      });
    });
  });

  it('drills into a webhook and exercises test plus retry actions', async () => {
    let retryCalls = 0;
    let testCalls = 0;

    server.use(
      http.get('/api/v1/marketplace/webhooks', () =>
        HttpResponse.json(
          wrap([
            {
              id: 7,
              webhookId: 'WHK-001',
              url: 'https://partner.example.com/webhooks/payments',
              events: ['payment.completed', 'account.updated'],
              tppClientId: 91,
              tppClientName: 'FinFlow',
              authType: 'HMAC',
              secretHash: null,
              status: 'ACTIVE',
              successRate: 98.5,
              totalDeliveries: 12,
              failedDeliveries: 1,
              lastDeliveredAt: '2026-03-23T08:00:00Z',
              createdAt: '2026-03-01T08:00:00Z',
              updatedAt: '2026-03-23T08:00:00Z',
            },
          ]),
        ),
      ),
      http.get('/api/v1/marketplace/webhooks/7/deliveries', () =>
        HttpResponse.json(
          wrap([
            {
              id: 101,
              webhookId: 7,
              event: 'payment.completed',
              httpStatus: 500,
              durationMs: 240,
              responseBody: 'Gateway timeout',
              status: 'FAILED',
              attemptCount: 2,
              deliveredAt: '2026-03-23T08:00:00Z',
            },
          ]),
        ),
      ),
      http.post('/api/v1/marketplace/webhooks/7/test', () => {
        testCalls += 1;
        return HttpResponse.json(
          wrap({
            success: true,
            statusCode: 202,
            responseTimeMs: 180,
            message: 'Accepted',
          }),
        );
      }),
      http.post('/api/v1/marketplace/webhooks/7/deliveries/101/retry', () => {
        retryCalls += 1;
        return HttpResponse.json(
          wrap({
            id: 101,
            webhookId: 7,
            event: 'payment.completed',
            httpStatus: 202,
            durationMs: 180,
            responseBody: 'Accepted',
            status: 'SUCCESS',
            attemptCount: 3,
            deliveredAt: '2026-03-23T09:00:00Z',
          }),
        );
      }),
    );

    renderWithProviders(<WebhookManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('https://partner.example.com/webhooks/payments')).toBeInTheDocument();
    });

    screen.getByTitle('Details').click();

    await waitFor(() => {
      expect(screen.getByText('Webhook Delivery Monitor')).toBeInTheDocument();
      expect(screen.getByText('Delivery Log')).toBeInTheDocument();
    });

    screen.getByRole('button', { name: 'Send Test' }).click();
    screen.getByRole('button', { name: 'Retry' }).click();

    await waitFor(() => {
      expect(testCalls).toBe(1);
      expect(retryCalls).toBe(1);
      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });
});
