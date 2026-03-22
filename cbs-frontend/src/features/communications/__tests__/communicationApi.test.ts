import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  apiGet: mocks.apiGet,
  apiPost: mocks.apiPost,
  apiPut: mocks.apiPut,
  apiDelete: mocks.apiDelete,
}));

import { notificationApi, routingApi } from '../api/communicationApi';

describe('notificationApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── List & Stats ─────────────────────────────────────────────────────

  it('list() calls GET /api/v1/notifications with params', async () => {
    mocks.apiGet.mockResolvedValue([]);
    await notificationApi.list({ search: 'hello', page: 0, size: 20 });
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/v1/notifications', { search: 'hello', page: 0, size: 20 });
  });

  it('getDeliveryStats() calls correct endpoint', async () => {
    mocks.apiGet.mockResolvedValue({ total: 100, delivered: 80 });
    const result = await notificationApi.getDeliveryStats();
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/v1/notifications/delivery-stats');
    expect(result).toHaveProperty('total');
  });

  it('getDeliveryTrend() calls trend endpoint', async () => {
    mocks.apiGet.mockResolvedValue([]);
    await notificationApi.getDeliveryTrend();
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/v1/notifications/delivery-stats/trend');
  });

  it('getDeliveryByChannel() calls by-channel endpoint', async () => {
    mocks.apiGet.mockResolvedValue([]);
    await notificationApi.getDeliveryByChannel();
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/v1/notifications/delivery-stats/by-channel');
  });

  it('getFailures() passes pagination params', async () => {
    mocks.apiGet.mockResolvedValue([]);
    await notificationApi.getFailures(2, 10);
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/v1/notifications/failures', { page: 2, size: 10 });
  });

  // ── Send ─────────────────────────────────────────────────────────────

  it('sendDirect() posts to /send-direct', async () => {
    const payload = {
      channel: 'EMAIL',
      recipientAddress: 'user@test.com',
      recipientName: 'Test',
      subject: 'Hi',
      body: 'Hello',
      customerId: 1,
      eventType: 'DIRECT',
    };
    mocks.apiPost.mockResolvedValue({ id: 1, status: 'PENDING' });
    await notificationApi.sendDirect(payload);
    expect(mocks.apiPost).toHaveBeenCalledWith('/api/v1/notifications/send-direct', payload);
  });

  it('sendBulk() posts recipients array', async () => {
    const payload = {
      channel: 'SMS',
      subject: 'Campaign',
      body: 'Buy now!',
      eventType: 'MARKETING',
      recipients: [
        { address: '+2348001234567', name: 'A' },
        { address: '+2348007654321', name: 'B' },
      ],
    };
    mocks.apiPost.mockResolvedValue({ sent: 2, failed: 0, total: 2 });
    const result = await notificationApi.sendBulk(payload);
    expect(mocks.apiPost).toHaveBeenCalledWith('/api/v1/notifications/send-bulk', payload);
    expect(result.total).toBe(2);
  });

  // ── Retry ────────────────────────────────────────────────────────────

  it('retryFailed() posts to /retry', async () => {
    mocks.apiPost.mockResolvedValue({ retried: 5 });
    const result = await notificationApi.retryFailed();
    expect(mocks.apiPost).toHaveBeenCalledWith('/api/v1/notifications/retry');
    expect(result.retried).toBe(5);
  });

  // ── Templates ────────────────────────────────────────────────────────

  it('getTemplates() lists all templates', async () => {
    mocks.apiGet.mockResolvedValue([{ id: 1, templateCode: 'ACC_OPEN' }]);
    const result = await notificationApi.getTemplates();
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/v1/notifications/templates');
    expect(result).toHaveLength(1);
  });

  it('createTemplate() posts to templates endpoint', async () => {
    const data = { templateCode: 'NEW', templateName: 'New', channel: 'EMAIL' as const, eventType: 'TEST', bodyTemplate: 'Hi {{customerName}}' };
    mocks.apiPost.mockResolvedValue({ id: 2, ...data });
    await notificationApi.createTemplate(data);
    expect(mocks.apiPost).toHaveBeenCalledWith('/api/v1/notifications/templates', data);
  });

  it('updateTemplate() puts to templates/:id', async () => {
    mocks.apiPut.mockResolvedValue({ id: 1 });
    await notificationApi.updateTemplate(1, { bodyTemplate: 'Updated' });
    expect(mocks.apiPut).toHaveBeenCalledWith('/api/v1/notifications/templates/1', { bodyTemplate: 'Updated' });
  });

  it('cloneTemplate() posts to clone endpoint', async () => {
    mocks.apiPost.mockResolvedValue({ id: 3, templateCode: 'ACC_OPEN_COPY_123' });
    const result = await notificationApi.cloneTemplate(1);
    expect(mocks.apiPost).toHaveBeenCalledWith('/api/v1/notifications/templates/1/clone');
    expect(result.templateCode).toContain('COPY');
  });

  it('publishTemplate() posts to publish endpoint', async () => {
    mocks.apiPost.mockResolvedValue({ id: 1, isActive: true });
    await notificationApi.publishTemplate(1);
    expect(mocks.apiPost).toHaveBeenCalledWith('/api/v1/notifications/templates/1/publish');
  });

  it('archiveTemplate() posts to archive endpoint', async () => {
    mocks.apiPost.mockResolvedValue({ id: 1, isActive: false });
    await notificationApi.archiveTemplate(1);
    expect(mocks.apiPost).toHaveBeenCalledWith('/api/v1/notifications/templates/1/archive');
  });

  it('testTemplate() sends test with recipient', async () => {
    mocks.apiPost.mockResolvedValue({ success: true, subject: 'Hi', body: 'Hello Test User' });
    await notificationApi.testTemplate(1, 'test@example.com');
    expect(mocks.apiPost).toHaveBeenCalledWith('/api/v1/notifications/templates/1/test', { recipient: 'test@example.com' });
  });

  it('previewTemplate() fetches resolved preview', async () => {
    mocks.apiGet.mockResolvedValue({ subject: 'Hello', body: 'Dear Adebayo', channel: 'EMAIL', isHtml: false });
    const result = await notificationApi.previewTemplate(1);
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/v1/notifications/templates/1/preview');
    expect(result.subject).toBe('Hello');
  });

  it('getTemplateVersions() fetches version history', async () => {
    mocks.apiGet.mockResolvedValue([{ versionNumber: 1 }, { versionNumber: 2 }]);
    const result = await notificationApi.getTemplateVersions(1);
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/v1/notifications/templates/1/versions');
    expect(result).toHaveLength(2);
  });

  // ── Channels ─────────────────────────────────────────────────────────

  it('getChannels() fetches channel configs', async () => {
    mocks.apiGet.mockResolvedValue([{ channel: 'EMAIL', enabled: true }]);
    await notificationApi.getChannels();
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/v1/notifications/channels');
  });

  it('updateChannel() puts config update', async () => {
    mocks.apiPut.mockResolvedValue({ channel: 'EMAIL', enabled: false });
    await notificationApi.updateChannel('EMAIL', { enabled: false });
    expect(mocks.apiPut).toHaveBeenCalledWith('/api/v1/notifications/channels/EMAIL', { enabled: false });
  });

  it('testChannel() sends test message', async () => {
    mocks.apiPost.mockResolvedValue({ success: true, messageId: 'abc-123' });
    const result = await notificationApi.testChannel('SMS', '+2348001234567');
    expect(mocks.apiPost).toHaveBeenCalledWith('/api/v1/notifications/channels/SMS/test', { recipient: '+2348001234567' });
    expect(result.success).toBe(true);
  });

  // ── Preferences ──────────────────────────────────────────────────────

  it('getCustomerPreferences() fetches by customer ID', async () => {
    mocks.apiGet.mockResolvedValue([{ channel: 'EMAIL', eventType: 'MARKETING', isEnabled: true }]);
    await notificationApi.getCustomerPreferences(42);
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/v1/notifications/preferences/42');
  });

  it('updateNotificationPreference() sends correct query params', async () => {
    mocks.apiPut.mockResolvedValue({ id: 1, isEnabled: false });
    await notificationApi.updateNotificationPreference(42, 'EMAIL', 'MARKETING', false);
    expect(mocks.apiPut).toHaveBeenCalledWith(
      '/api/v1/notifications/preferences?customerId=42&channel=EMAIL&eventType=MARKETING&enabled=false'
    );
  });

  // ── Scheduled Campaigns ──────────────────────────────────────────────

  it('getScheduled() fetches scheduled list', async () => {
    mocks.apiGet.mockResolvedValue([]);
    await notificationApi.getScheduled(0, 10);
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/v1/notifications/scheduled', { page: 0, size: 10 });
  });

  it('deleteScheduled() calls DELETE on campaign', async () => {
    mocks.apiDelete.mockResolvedValue({ id: '5', deleted: 'true' });
    await notificationApi.deleteScheduled(5);
    expect(mocks.apiDelete).toHaveBeenCalledWith('/api/v1/notifications/scheduled/5');
  });

  it('toggleScheduled() calls PUT toggle', async () => {
    mocks.apiPut.mockResolvedValue({ id: 3, status: 'PAUSED' });
    await notificationApi.toggleScheduled(3);
    expect(mocks.apiPut).toHaveBeenCalledWith('/api/v1/notifications/scheduled/3/toggle');
  });

  // ── Mark Read ────────────────────────────────────────────────────────

  it('markAllRead() posts with customer ID', async () => {
    mocks.apiPost.mockResolvedValue({ markedAsRead: 3 });
    const result = await notificationApi.markAllRead(42);
    expect(mocks.apiPost).toHaveBeenCalledWith('/api/v1/notifications/mark-all-read?customerId=42');
    expect(result.markedAsRead).toBe(3);
  });

  it('getUnreadCount() fetches count for customer', async () => {
    mocks.apiGet.mockResolvedValue({ unreadCount: 7 });
    const result = await notificationApi.getUnreadCount(42);
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/v1/notifications/unread-count', { customerId: 42 });
    expect(result.unreadCount).toBe(7);
  });
});

// ── Routing API ────────────────────────────────────────────────────────────

describe('routingApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getRules() fetches routing rules', async () => {
    mocks.apiGet.mockResolvedValue([{ id: 1, ruleName: 'VIP Route' }]);
    const result = await routingApi.getRules();
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/v1/contact-routing/rules');
    expect(result).toHaveLength(1);
  });

  it('createRule() posts new rule', async () => {
    const rule = { ruleName: 'New Rule', ruleType: 'VIP', priority: 1, isActive: true };
    mocks.apiPost.mockResolvedValue({ id: 2, ...rule });
    await routingApi.createRule(rule);
    expect(mocks.apiPost).toHaveBeenCalledWith('/api/v1/contact-routing/rules', rule);
  });

  it('routeContact() tests routing logic', async () => {
    mocks.apiPost.mockResolvedValue({ queue: 'VIP_QUEUE', agent: 'AGENT-001' });
    const result = await routingApi.routeContact(42, 'Account Issue', 'PHONE');
    expect(mocks.apiPost).toHaveBeenCalledWith(
      '/api/v1/contact-routing/route?customerId=42&reason=Account%20Issue&channel=PHONE'
    );
    expect(result).toHaveProperty('queue');
  });
});
