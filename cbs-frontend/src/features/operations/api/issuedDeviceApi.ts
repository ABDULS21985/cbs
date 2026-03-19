import { apiGet, apiPost } from '@/lib/api';
import type { IssuedDevice } from '../types/issuedDevice';

export const issuedDevicesApi = {
  /** POST /v1/issued-devices/{code}/activate */
  activate: (code: string) =>
    apiPost<IssuedDevice>(`/api/v1/issued-devices/${code}/activate`),

  /** POST /v1/issued-devices/{code}/block */
  block: (code: string) =>
    apiPost<IssuedDevice>(`/api/v1/issued-devices/${code}/block`),

  /** POST /v1/issued-devices/{code}/replace */
  replace: (code: string) =>
    apiPost<IssuedDevice>(`/api/v1/issued-devices/${code}/replace`),

  /** GET /v1/issued-devices/customer/{id} */
  getByCustomer: (id: number) =>
    apiGet<IssuedDevice[]>(`/api/v1/issued-devices/customer/${id}`),

};
