import { apiGet, apiPost } from '@/lib/api';

// ---- Types ----

export type DocumentType = 'PDF' | 'DOCX' | 'XLSX' | 'IMAGE' | 'TXT' | 'CSV';
export type DocumentFolder =
  | 'customer/kyc'
  | 'customer/agreements'
  | 'customer/correspondence'
  | 'loan/applications'
  | 'loan/collateral'
  | 'loan/legal'
  | 'regulatory/cbn'
  | 'regulatory/ndic'
  | 'internal/policies'
  | 'internal/procedures'
  | 'internal/training'
  | 'templates';
export type OcrStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'VERIFIED' | 'FAILED';
export type RetentionClass =
  | 'KYC'
  | 'TRANSACTION'
  | 'LOAN'
  | 'INTERNAL'
  | 'REGULATORY'
  | 'CORRESPONDENCE';

export interface DocumentFile {
  id: string;
  name: string;
  type: DocumentType;
  folder: DocumentFolder;
  sizeBytes: number;
  tags: string[];
  uploadedBy: string;
  uploadedAt: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  version: number;
  retentionClass: RetentionClass;
  retentionUntil?: string;
  ocrProcessed?: boolean;
  extractedText?: string;
}

export interface OcrQueueItem {
  id: string;
  documentId: string;
  documentName: string;
  type: DocumentType;
  uploadedAt: string;
  pages: number;
  status: OcrStatus;
  accuracy?: number;
  extractedText?: string;
  lowConfidenceWords?: string[];
  processedAt?: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  mergeFields: string[];
  lastGenerated?: string;
  generatedCount: number;
}

export interface RetentionPolicy {
  id: string;
  category: RetentionClass;
  description: string;
  retentionYears: number;
  autoDelete: boolean;
  archiveAfterYears?: number;
  regulatoryBasis: string;
  documentCount: number;
  expiringSoon: number;
}

// ---- API Functions ----

export function getDocuments(folder?: DocumentFolder, search?: string): Promise<DocumentFile[]> {
  return apiGet<DocumentFile[]>('/api/v1/documents', { folder, search });
}

export function getDocumentById(id: string): Promise<DocumentFile | null> {
  return apiGet<DocumentFile>(`/api/v1/documents/${id}`);
}

export function uploadDocument(
  file: File,
  folder: DocumentFolder,
  tags: string[] = [],
): Promise<DocumentFile> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  tags.forEach((t) => formData.append('tags', t));
  return apiPost<DocumentFile>('/api/v1/documents/upload', formData);
}

export function deleteDocument(id: string): Promise<void> {
  return apiPost<void>(`/api/v1/documents/${id}/delete`);
}

export function updateDocumentTags(id: string, tags: string[]): Promise<DocumentFile> {
  return apiPost<DocumentFile>(`/api/v1/documents/${id}/tags`, { tags });
}

export function linkToEntity(
  id: string,
  entityType: string,
  entityId: string,
): Promise<DocumentFile> {
  return apiPost<DocumentFile>(`/api/v1/documents/${id}/link`, { entityType, entityId });
}

export function getOcrQueue(): Promise<OcrQueueItem[]> {
  return apiGet<OcrQueueItem[]>('/api/v1/documents/ocr-queue');
}

export function getOcrItem(id: string): Promise<OcrQueueItem | null> {
  return apiGet<OcrQueueItem>(`/api/v1/documents/ocr-queue/${id}`);
}

export function submitOcrCorrection(id: string, correctedText: string): Promise<OcrQueueItem> {
  return apiPost<OcrQueueItem>(`/api/v1/documents/ocr-queue/${id}/correct`, { correctedText });
}

export function verifyOcrItem(id: string): Promise<OcrQueueItem> {
  return apiPost<OcrQueueItem>(`/api/v1/documents/ocr-queue/${id}/verify`);
}

export function getDocumentTemplates(): Promise<DocumentTemplate[]> {
  return apiGet<DocumentTemplate[]>('/api/v1/documents/templates');
}

export function generateFromTemplate(
  templateId: string,
  entityId: string,
  entityType: string,
): Promise<{ downloadUrl: string; documentId: string }> {
  return apiPost<{ downloadUrl: string; documentId: string }>(`/api/v1/documents/templates/${templateId}/generate`, { entityId, entityType });
}

export function getRetentionPolicies(): Promise<RetentionPolicy[]> {
  return apiGet<RetentionPolicy[]>('/api/v1/documents/retention-policies');
}

export function updateRetentionPolicy(
  id: string,
  data: Partial<RetentionPolicy>,
): Promise<RetentionPolicy> {
  return apiPost<RetentionPolicy>(`/api/v1/documents/retention-policies/${id}`, data);
}

export function runRetentionCheck(): Promise<{ expiredCount: number; archivedCount: number; message: string }> {
  return apiPost<{ expiredCount: number; archivedCount: number; message: string }>('/api/v1/documents/retention-check');
}
