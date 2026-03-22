import axios from 'axios';
import type { AxiosError, AxiosResponse } from 'axios';
import { useAuthStore } from '@/stores/authStore';
import type { ApiResponse } from '@/types/common';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

function normalizeApiUrl(url?: string): string | undefined {
  if (!url || /^(https?:)?\/\//.test(url)) {
    return url;
  }

  if (url.startsWith('/api/')) {
    return url;
  }

  if (url.startsWith('/v1/') || url.startsWith('/v3/') || url.startsWith('/actuator/')) {
    return `/api${url}`;
  }

  return url;
}

// Request: attach JWT + correlation ID
api.interceptors.request.use((config) => {
  config.url = normalizeApiUrl(config.url) as string;
  const token = useAuthStore.getState().accessToken;
  if (!config.headers) config.headers = new axios.AxiosHeaders();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Request-ID'] = crypto.randomUUID();
  return config;
});

// Response: handle 401 with silent refresh
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !(originalRequest as any)._retry) {
      (originalRequest as any)._retry = true;
      try {
        await useAuthStore.getState().refreshToken();
        const newToken = useAuthStore.getState().accessToken;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login?reason=session_expired';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ---- Typed API helpers ----

export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await api.get<ApiResponse<T>>(url, { params });
  return data.data;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.post<ApiResponse<T>>(url, body);
  return data.data;
}

/** POST with query params (for Spring @RequestParam endpoints) */
export async function apiPostParams<T>(url: string, params: Record<string, unknown>): Promise<T> {
  const { data } = await api.post<ApiResponse<T>>(url, null, { params });
  return data.data;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.patch<ApiResponse<T>>(url, body);
  return data.data;
}

/** PATCH with query params (for Spring @RequestParam endpoints) */
export async function apiPatchParams<T>(url: string, params: Record<string, unknown>): Promise<T> {
  const { data } = await api.patch<ApiResponse<T>>(url, null, { params });
  return data.data;
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const { data } = await api.put<ApiResponse<T>>(url, body);
  return data.data;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const { data } = await api.delete<ApiResponse<T>>(url);
  return data.data;
}

export async function apiUpload<T>(url: string, file: File, fieldName = 'file'): Promise<T> {
  const formData = new FormData();
  formData.append(fieldName, file);
  const { data } = await api.post<ApiResponse<T>>(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function apiDownload(url: string, filename: string): Promise<void> {
  const response = await api.get(url, { responseType: 'blob' });
  const blob = new Blob([response.data as BlobPart]);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
