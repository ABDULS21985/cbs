import { apiGet, apiPost } from '@/lib/api';
import type { UssdMenu } from '../types/ussd';

export const ussdApi = {
  /** POST /v1/ussd/menus */
  createMenu: (data: Partial<UssdMenu>) =>
    apiPost<UssdMenu>('/api/v1/ussd/menus', data),

  /** GET /v1/ussd/menus */
  getRootMenus: (params?: Record<string, unknown>) =>
    apiGet<UssdMenu[]>('/api/v1/ussd/menus', params),

};
