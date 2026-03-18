export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
  page?: PageMeta;
  timestamp: string;
}

export interface PageMeta {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'ASC' | 'DESC';
}

export type EntityStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'CLOSED' | 'PENDING' | 'DRAFT';

export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'success', APPROVED: 'success', COMPLETED: 'success', SETTLED: 'success',
  PAID: 'success', VERIFIED: 'success', MATCHED: 'success',
  PENDING: 'warning', DRAFT: 'warning', PROCESSING: 'warning', UNDER_REVIEW: 'warning',
  IN_PROGRESS: 'warning', PARTIALLY_PAID: 'warning',
  INACTIVE: 'default', CLOSED: 'default', EXPIRED: 'default', ARCHIVED: 'default',
  SUSPENDED: 'danger', BLOCKED: 'danger', FAILED: 'danger', REJECTED: 'danger',
  OVERDUE: 'danger', DEFAULTED: 'danger', CANCELLED: 'danger',
};

export type CurrencyCode = 'NGN' | 'USD' | 'EUR' | 'GBP' | 'XOF' | 'ZAR' | 'GHS' | 'KES';

export interface DateRange { from: string; to: string; }

export interface Auditable {
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  version: number;
}
