import { apiGet, apiPost } from '@/lib/api';
import type { CashMovement, CashVault } from '../types/cashVault';

export const cashVaultsApi = {
  /** POST /v1/cash-vaults — register a new cash vault */
  register: (data: Partial<CashVault>) =>
    apiPost<CashVault>('/api/v1/cash-vaults', data),

  /** POST /v1/cash-vaults/movements — record a cash movement */
  recordMovement: (data: Partial<CashMovement>) =>
    apiPost<CashMovement>('/api/v1/cash-vaults/movements', data),

  /** GET /v1/cash-vaults/movements — list all movements */
  listAllMovements: () =>
    apiGet<CashMovement[]>('/api/v1/cash-vaults/movements'),

  /** POST /v1/cash-vaults/movements/{ref}/confirm — confirm delivery */
  confirmDelivery: (ref: string) =>
    apiPost<CashMovement>(`/api/v1/cash-vaults/movements/${ref}/confirm`),

  /** POST /v1/cash-vaults/{code}/reconcile — reconcile a vault */
  reconcile: (code: string) =>
    apiPost<CashVault>(`/api/v1/cash-vaults/${code}/reconcile`),

  /** GET /v1/cash-vaults/type/{type} — get vaults by type */
  getByType: (type: string) =>
    apiGet<CashVault[]>(`/api/v1/cash-vaults/type/${type}`),

  /** GET /v1/cash-vaults/{code}/movements — get movements for a specific vault */
  getMovements: (code: string) =>
    apiGet<CashMovement[]>(`/api/v1/cash-vaults/${code}/movements`),

};
