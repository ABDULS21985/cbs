import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/lib/api', () => ({
  default: mocks.api,
  apiGet: mocks.apiGet,
  apiPost: mocks.apiPost,
}));

import { transactionApi } from '../api/transactionApi';

describe('transactionApi', () => {
  const originalCreateElement = document.createElement.bind(document);
  const RealURL = URL;
  const createObjectURL = vi.fn(() => 'blob:test');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    class MockURL extends RealURL {
      static createObjectURL = createObjectURL;
      static revokeObjectURL = revokeObjectURL;
    }
    vi.stubGlobal('URL', MockURL);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.createElement = originalCreateElement;
  });

  it('searchTransactions builds correct query params', async () => {
    mocks.api.get.mockResolvedValue({
      data: {
        data: {
          transactions: [],
          summary: { totalResults: 0, totalDebit: 0, totalCredit: 0, netAmount: 0 },
        },
      },
    });

    await transactionApi.searchTransactions({
      search: 'rent',
      accountNumber: '0123456789',
      type: 'DEBIT',
      status: 'COMPLETED',
      page: 2,
      pageSize: 50,
      sort: 'postingDate,desc',
    });

    expect(mocks.api.get).toHaveBeenCalledWith('/api/v1/transactions', {
      params: {
        search: 'rent',
        accountNumber: '0123456789',
        type: 'DEBIT',
        status: 'COMPLETED',
        page: 2,
        pageSize: 50,
        sort: 'postingDate,desc',
      },
      signal: undefined,
    });
  });

  it('searchTransactions strips ALL values from params', async () => {
    mocks.api.get.mockResolvedValue({
      data: {
        data: {
          transactions: [],
          summary: { totalResults: 0, totalDebit: 0, totalCredit: 0, netAmount: 0 },
        },
      },
    });

    await transactionApi.searchTransactions({
      type: 'ALL',
      channel: 'ALL',
      status: 'ALL',
      flaggedOnly: false,
      sort: 'postingDate,desc',
    });

    expect(mocks.api.get).toHaveBeenCalledWith('/api/v1/transactions', {
      params: { sort: 'postingDate,desc' },
      signal: undefined,
    });
  });

  it('searchTransactions strips empty string values', async () => {
    mocks.api.get.mockResolvedValue({
      data: {
        data: {
          transactions: [],
          summary: { totalResults: 0, totalDebit: 0, totalCredit: 0, netAmount: 0 },
        },
      },
    });

    await transactionApi.searchTransactions({
      search: '',
      accountNumber: '',
      customerId: '',
      sort: 'postingDate,desc',
    });

    expect(mocks.api.get).toHaveBeenCalledWith('/api/v1/transactions', {
      params: { sort: 'postingDate,desc' },
      signal: undefined,
    });
  });

  it('getTransaction fetches by id', async () => {
    mocks.api.get.mockResolvedValue({
      data: {
        data: { id: 'txn-1', reference: 'TXN-1' },
      },
    });

    await transactionApi.getTransaction('txn-1');

    expect(mocks.api.get).toHaveBeenCalledWith('/api/v1/transactions/txn-1', {
      signal: undefined,
    });
  });

  it('reverseTransaction sends reason in body', async () => {
    mocks.apiPost.mockResolvedValue({ status: 'PENDING' });

    await transactionApi.reverseTransaction('txn-1', {
      reasonCategory: 'CUSTOMER_REQUEST',
      notes: 'Duplicate debit',
    });

    expect(mocks.apiPost).toHaveBeenCalledWith('/api/v1/transactions/txn-1/reverse', {
      reasonCategory: 'CUSTOMER_REQUEST',
      notes: 'Duplicate debit',
    });
  });

  it('downloadReceipt triggers file download', async () => {
    const click = vi.fn();
    const anchorData = { click, download: '', _href: '' };
    const anchor = Object.defineProperty(anchorData, 'href', {
      get() { return anchorData._href; },
      set(value: string) { anchorData._href = value; },
      enumerable: true,
      configurable: true,
    }) as unknown as HTMLAnchorElement;

    document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'a') {
        return anchor;
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement;

    mocks.api.get.mockResolvedValue({
      data: new Uint8Array([1, 2, 3]),
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="receipt.pdf"',
      },
    });

    await transactionApi.downloadReceipt('txn-1');

    expect(createObjectURL).toHaveBeenCalled();
    expect(anchor.download).toBe('receipt.pdf');
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});
