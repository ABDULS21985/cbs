import axios, { AxiosInstance } from 'axios';

const apiUrl = process.env.API_URL || 'http://localhost:8081';

class TestApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: apiUrl,
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async authenticate(username: string, password: string): Promise<string> {
    const res = await this.client.post('/api/v1/auth/login', { username, password });
    this.token = res.data.token || res.data.accessToken;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    return this.token!;
  }

  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    const res = await this.client.get<T>(path, { params });
    return res.data;
  }

  async post<T>(path: string, data?: any): Promise<T> {
    const res = await this.client.post<T>(path, data);
    return res.data;
  }

  async put<T>(path: string, data?: any): Promise<T> {
    const res = await this.client.put<T>(path, data);
    return res.data;
  }

  async patch<T>(path: string, data?: any): Promise<T> {
    const res = await this.client.patch<T>(path, data);
    return res.data;
  }

  async delete<T>(path: string): Promise<T> {
    const res = await this.client.delete<T>(path);
    return res.data;
  }

  // Domain-specific helpers
  async createTestCustomer(overrides?: Record<string, any>) {
    return this.post('/api/v1/customers', {
      type: 'INDIVIDUAL',
      title: 'Mr',
      firstName: 'Test',
      lastName: `Customer-${Date.now()}`,
      dateOfBirth: '1990-01-15',
      gender: 'MALE',
      nationality: 'Nigerian',
      nin: `NIN${Date.now()}`,
      bvn: `BVN${Date.now()}`,
      email: `test.${Date.now()}@automation.cba`,
      phoneNumber: `080${Date.now().toString().slice(-8)}`,
      address: { street: '123 Test Street', city: 'Lagos', state: 'Lagos', country: 'Nigeria' },
      createdBy: 'test-automation',
      ...overrides,
    });
  }

  async createTestAccount(customerId: number, productCode = 'SAV001') {
    return this.post('/api/v1/accounts', {
      customerId,
      productCode,
      currency: 'NGN',
      initialDeposit: 50000,
      createdBy: 'test-automation',
    });
  }

  async createTestLoanApplication(customerId: number, productCode = 'PL001') {
    return this.post('/api/v1/loans/applications', {
      customerId,
      productCode,
      requestedAmount: 500000,
      tenorMonths: 12,
      purpose: 'Working capital',
      repaymentMethod: 'EQUAL_INSTALLMENT',
      repaymentFrequency: 'MONTHLY',
      monthlyIncome: 300000,
      monthlyExpenses: 100000,
      createdBy: 'test-automation',
    });
  }
}

export const testApi = new TestApiClient();
