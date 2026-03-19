import { describe, it, expect } from 'vitest';

describe('Test Infrastructure Smoke Test', () => {
  it('vitest runs correctly', () => {
    expect(1 + 1).toBe(2);
  });

  it('can import factories', async () => {
    const { createMockCustomer } = await import('./factories/customerFactory');
    const customer = createMockCustomer();
    expect(customer.cifNumber).toBeTruthy();
    expect(customer.status).toBe('ACTIVE');
  });

  it('can import MSW server', async () => {
    const { server } = await import('./msw/server');
    expect(server).toBeDefined();
    expect(server.listen).toBeDefined();
  });
});
