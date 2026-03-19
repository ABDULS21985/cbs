import { apiGet, apiPost } from '@/lib/api';
import type { CashMovement, CashVault } from '../types/cashVault';

export const cashVaultsApi = {
  /** POST /v1/cash-vaults/movements */
  register: (data: Partial<CashVault>) =>
    apiPost<CashVault>('/api/v1/cash-vaults/movements', data),

  /** POST /v1/cash-vaults/movements/{ref}/confirm */
  confirm: (ref: string) =>
    apiPost<CashMovement>(`/api/v1/cash-vaults/movements/${ref}/confirm`),

  /** POST /v1/cash-vaults/{code}/reconcile */
  confirm2: (code: string) =>
    apiPost<CashMovement>(`/api/v1/cash-vaults/${code}/reconcile`),

  /** GET /v1/cash-vaults/type/{type} */
  getByType: (type: string) =>
    apiGet<CashVault[]>(`/api/v1/cash-vaults/type/${type}`),

  /** GET /v1/cash-vaults/{code}/movements */
  getByType2: (code: string) =>
    apiGet<CashVault[]>(`/api/v1/cash-vaults/${code}/movements`),

};
