import {
  apiDeleteParams,
  apiGet,
  apiGetPaged,
  apiPost,
  apiPostParams,
  apiPut,
} from '@/lib/api';
import type {
  FatwaComplianceSummary,
  IslamicContractType,
  IslamicProduct,
  IslamicProductDraft,
  IslamicProductVersion,
} from '../types/islamicProduct';

export function searchIslamicProducts(params?: Record<string, unknown>) {
  return apiGetPaged<IslamicProduct[]>('/api/v1/islamic-products', params);
}

export function getIslamicProductById(id: number) {
  return apiGet<IslamicProduct>(`/api/v1/islamic-products/${id}`);
}

export function getIslamicProductByCode(productCode: string) {
  return apiGet<IslamicProduct>(`/api/v1/islamic-products/code/${encodeURIComponent(productCode)}`);
}

export function createIslamicProduct(payload: IslamicProductDraft) {
  return apiPost<IslamicProduct>('/api/v1/islamic-products', payload);
}

export function updateIslamicProduct(id: number, payload: IslamicProductDraft) {
  return apiPut<IslamicProduct>(`/api/v1/islamic-products/${id}`, payload);
}

export function submitIslamicProductForApproval(id: number) {
  return apiPost<Record<string, boolean>>(`/api/v1/islamic-products/${id}/submit-for-approval`);
}

export function approveIslamicProduct(id: number) {
  return apiPost<Record<string, boolean>>(`/api/v1/islamic-products/${id}/approve`);
}

export function activateIslamicProduct(id: number) {
  return apiPost<Record<string, boolean>>(`/api/v1/islamic-products/${id}/activate`);
}

export function suspendIslamicProduct(id: number, reason?: string) {
  if (reason) {
    return apiPostParams<Record<string, boolean>>(`/api/v1/islamic-products/${id}/suspend`, { reason });
  }
  return apiPost<Record<string, boolean>>(`/api/v1/islamic-products/${id}/suspend`);
}

export function retireIslamicProduct(id: number, reason?: string) {
  if (reason) {
    return apiPostParams<Record<string, boolean>>(`/api/v1/islamic-products/${id}/retire`, { reason });
  }
  return apiPost<Record<string, boolean>>(`/api/v1/islamic-products/${id}/retire`);
}

export function linkFatwaToIslamicProduct(id: number, fatwaId: number) {
  return apiPostParams<Record<string, boolean>>(`/api/v1/islamic-products/${id}/link-fatwa`, { fatwaId });
}

export function unlinkFatwaFromIslamicProduct(id: number, reason?: string) {
  return apiDeleteParams<Record<string, boolean>>(`/api/v1/islamic-products/${id}/link-fatwa`, {
    reason: reason ?? '',
  });
}

export function getIslamicProductHistory(id: number) {
  return apiGet<IslamicProductVersion[]>(`/api/v1/islamic-products/${id}/history`);
}

export function getFatwaComplianceSummary() {
  return apiGet<FatwaComplianceSummary>('/api/v1/islamic-products/fatwa-compliance');
}

export function getIslamicContractTypes() {
  return apiGet<IslamicContractType[]>('/api/v1/islamic-contract-types');
}