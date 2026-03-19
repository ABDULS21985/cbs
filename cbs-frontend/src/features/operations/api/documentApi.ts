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
  entityType?: string; // 'customer' | 'loan' | 'account'
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
  accuracy?: number; // 0-100
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
  expiringSoon: number; // count expiring within 90 days
}

// ---- Mock Data ----

const DEMO_DOCUMENTS: DocumentFile[] = [
  {
    id: 'doc-001',
    name: 'National_ID_Card_Adeyemi_Kolawole.pdf',
    type: 'PDF',
    folder: 'customer/kyc',
    sizeBytes: 1_240_000,
    tags: ['kyc', 'identity', 'verified'],
    uploadedBy: 'fatima.ibrahim@cbabank.ng',
    uploadedAt: '2025-11-10T09:14:00Z',
    entityType: 'customer',
    entityId: 'CUS-000142',
    entityName: 'Adeyemi Kolawole',
    version: 1,
    retentionClass: 'KYC',
    retentionUntil: '2035-11-10',
    ocrProcessed: true,
    extractedText: 'FEDERAL REPUBLIC OF NIGERIA NATIONAL IDENTITY MANAGEMENT COMMISSION...',
  },
  {
    id: 'doc-002',
    name: 'Utility_Bill_March2025_Okonkwo.pdf',
    type: 'PDF',
    folder: 'customer/kyc',
    sizeBytes: 890_000,
    tags: ['kyc', 'address-proof'],
    uploadedBy: 'emeka.obi@cbabank.ng',
    uploadedAt: '2025-12-02T11:30:00Z',
    entityType: 'customer',
    entityId: 'CUS-000289',
    entityName: 'Chidi Okonkwo',
    version: 2,
    retentionClass: 'KYC',
    retentionUntil: '2035-12-02',
    ocrProcessed: true,
  },
  {
    id: 'doc-003',
    name: 'Account_Opening_Agreement_Fatima_Bello.docx',
    type: 'DOCX',
    folder: 'customer/agreements',
    sizeBytes: 320_000,
    tags: ['agreement', 'signed', 'current-account'],
    uploadedBy: 'grace.eze@cbabank.ng',
    uploadedAt: '2026-01-15T14:22:00Z',
    entityType: 'customer',
    entityId: 'CUS-000401',
    entityName: 'Fatima Bello',
    version: 1,
    retentionClass: 'CORRESPONDENCE',
    retentionUntil: '2036-01-15',
  },
  {
    id: 'doc-004',
    name: 'E-Banking_Terms_and_Conditions_v3.pdf',
    type: 'PDF',
    folder: 'customer/agreements',
    sizeBytes: 2_100_000,
    tags: ['agreement', 'e-banking', 'terms'],
    uploadedBy: 'admin@cbabank.ng',
    uploadedAt: '2025-09-01T08:00:00Z',
    entityType: 'customer',
    entityId: 'CUS-000401',
    entityName: 'Fatima Bello',
    version: 3,
    retentionClass: 'CORRESPONDENCE',
    retentionUntil: '2035-09-01',
  },
  {
    id: 'doc-005',
    name: 'Complaint_Resolution_Letter_Nov2025.pdf',
    type: 'PDF',
    folder: 'customer/correspondence',
    sizeBytes: 410_000,
    tags: ['complaint', 'resolved', 'correspondence'],
    uploadedBy: 'support@cbabank.ng',
    uploadedAt: '2025-11-20T16:45:00Z',
    entityType: 'customer',
    entityId: 'CUS-000142',
    entityName: 'Adeyemi Kolawole',
    version: 1,
    retentionClass: 'CORRESPONDENCE',
    retentionUntil: '2032-11-20',
  },
  {
    id: 'doc-006',
    name: 'Loan_Application_Form_LN-20250887.pdf',
    type: 'PDF',
    folder: 'loan/applications',
    sizeBytes: 1_870_000,
    tags: ['loan', 'application', 'personal-loan'],
    uploadedBy: 'john.adeyemi@cbabank.ng',
    uploadedAt: '2025-10-05T10:00:00Z',
    entityType: 'loan',
    entityId: 'LN-20250887',
    entityName: 'Personal Loan - Ngozi Eze',
    version: 1,
    retentionClass: 'LOAN',
    retentionUntil: '2035-10-05',
    ocrProcessed: false,
  },
  {
    id: 'doc-007',
    name: 'Property_Valuation_Report_Plot47_Lekki.pdf',
    type: 'PDF',
    folder: 'loan/collateral',
    sizeBytes: 5_430_000,
    tags: ['collateral', 'property', 'valuation', 'lekki'],
    uploadedBy: 'samuel.taiwo@cbabank.ng',
    uploadedAt: '2025-08-22T09:11:00Z',
    entityType: 'loan',
    entityId: 'LN-20250432',
    entityName: 'Mortgage Loan - Taiwo Samuel',
    version: 2,
    retentionClass: 'LOAN',
    retentionUntil: '2040-08-22',
  },
  {
    id: 'doc-008',
    name: 'Legal_Charge_Deed_LN20250432.pdf',
    type: 'PDF',
    folder: 'loan/legal',
    sizeBytes: 3_200_000,
    tags: ['legal', 'charge-deed', 'mortgage'],
    uploadedBy: 'legal@cbabank.ng',
    uploadedAt: '2025-08-30T13:30:00Z',
    entityType: 'loan',
    entityId: 'LN-20250432',
    entityName: 'Mortgage Loan - Taiwo Samuel',
    version: 1,
    retentionClass: 'LOAN',
    retentionUntil: '2045-08-30',
  },
  {
    id: 'doc-009',
    name: 'CBN_BSS_Return_Feb2026.xlsx',
    type: 'XLSX',
    folder: 'regulatory/cbn',
    sizeBytes: 760_000,
    tags: ['cbn', 'bss', 'regulatory', 'feb-2026'],
    uploadedBy: 'reporting@cbabank.ng',
    uploadedAt: '2026-03-05T08:00:00Z',
    version: 1,
    retentionClass: 'REGULATORY',
    retentionUntil: '2036-03-05',
  },
  {
    id: 'doc-010',
    name: 'CBN_CRR_Compliance_Q4_2025.pdf',
    type: 'PDF',
    folder: 'regulatory/cbn',
    sizeBytes: 1_100_000,
    tags: ['cbn', 'crr', 'q4-2025', 'compliance'],
    uploadedBy: 'compliance@cbabank.ng',
    uploadedAt: '2026-01-10T07:45:00Z',
    version: 1,
    retentionClass: 'REGULATORY',
    retentionUntil: '2036-01-10',
  },
  {
    id: 'doc-011',
    name: 'NDIC_Premium_Computation_2025.xlsx',
    type: 'XLSX',
    folder: 'regulatory/ndic',
    sizeBytes: 540_000,
    tags: ['ndic', 'premium', '2025'],
    uploadedBy: 'reporting@cbabank.ng',
    uploadedAt: '2026-02-14T10:20:00Z',
    version: 1,
    retentionClass: 'REGULATORY',
    retentionUntil: '2036-02-14',
  },
  {
    id: 'doc-012',
    name: 'AML_CFT_Policy_v7_2025.pdf',
    type: 'PDF',
    folder: 'internal/policies',
    sizeBytes: 4_800_000,
    tags: ['policy', 'aml', 'cft', 'compliance', 'v7'],
    uploadedBy: 'compliance@cbabank.ng',
    uploadedAt: '2025-06-01T09:00:00Z',
    version: 7,
    retentionClass: 'INTERNAL',
    retentionUntil: '2030-06-01',
  },
  {
    id: 'doc-013',
    name: 'Credit_Risk_Policy_2025.pdf',
    type: 'PDF',
    folder: 'internal/policies',
    sizeBytes: 3_600_000,
    tags: ['policy', 'credit-risk', '2025'],
    uploadedBy: 'risk@cbabank.ng',
    uploadedAt: '2025-01-15T08:30:00Z',
    version: 4,
    retentionClass: 'INTERNAL',
    retentionUntil: '2030-01-15',
  },
  {
    id: 'doc-014',
    name: 'KYC_Onboarding_Procedure_v3.docx',
    type: 'DOCX',
    folder: 'internal/procedures',
    sizeBytes: 1_200_000,
    tags: ['procedure', 'kyc', 'onboarding'],
    uploadedBy: 'operations@cbabank.ng',
    uploadedAt: '2025-04-10T11:00:00Z',
    version: 3,
    retentionClass: 'INTERNAL',
    retentionUntil: '2030-04-10',
  },
  {
    id: 'doc-015',
    name: 'Teller_Operations_Manual.pdf',
    type: 'PDF',
    folder: 'internal/procedures',
    sizeBytes: 7_200_000,
    tags: ['procedure', 'teller', 'operations', 'manual'],
    uploadedBy: 'training@cbabank.ng',
    uploadedAt: '2025-03-01T09:00:00Z',
    version: 2,
    retentionClass: 'INTERNAL',
    retentionUntil: '2030-03-01',
  },
  {
    id: 'doc-016',
    name: 'New_Staff_Induction_Program_2026.pdf',
    type: 'PDF',
    folder: 'internal/training',
    sizeBytes: 9_800_000,
    tags: ['training', 'induction', '2026', 'hr'],
    uploadedBy: 'hr@cbabank.ng',
    uploadedAt: '2026-01-02T08:00:00Z',
    version: 1,
    retentionClass: 'INTERNAL',
    retentionUntil: '2031-01-02',
  },
  {
    id: 'doc-017',
    name: 'Passport_Photo_Ngozi_Eze.jpg',
    type: 'IMAGE',
    folder: 'customer/kyc',
    sizeBytes: 245_000,
    tags: ['kyc', 'passport-photo'],
    uploadedBy: 'emeka.obi@cbabank.ng',
    uploadedAt: '2025-10-05T10:15:00Z',
    entityType: 'customer',
    entityId: 'CUS-000350',
    entityName: 'Ngozi Eze',
    version: 1,
    retentionClass: 'KYC',
    retentionUntil: '2035-10-05',
    ocrProcessed: false,
  },
  {
    id: 'doc-018',
    name: 'CAC_Certificate_Eze_Ventures_Ltd.pdf',
    type: 'PDF',
    folder: 'customer/kyc',
    sizeBytes: 1_680_000,
    tags: ['kyc', 'cac', 'corporate', 'certificate'],
    uploadedBy: 'grace.eze@cbabank.ng',
    uploadedAt: '2025-07-18T14:00:00Z',
    entityType: 'customer',
    entityId: 'CUS-000512',
    entityName: 'Eze Ventures Ltd',
    version: 1,
    retentionClass: 'KYC',
    retentionUntil: '2035-07-18',
    ocrProcessed: true,
  },
  {
    id: 'doc-019',
    name: 'Fixed_Deposit_Certificate_FD-20261002.pdf',
    type: 'PDF',
    folder: 'customer/agreements',
    sizeBytes: 510_000,
    tags: ['fixed-deposit', 'certificate', 'fd'],
    uploadedBy: 'deposits@cbabank.ng',
    uploadedAt: '2026-02-01T10:00:00Z',
    entityType: 'account',
    entityId: 'FD-20261002',
    entityName: 'Fixed Deposit - Halima Musa',
    version: 1,
    retentionClass: 'TRANSACTION',
    retentionUntil: '2033-02-01',
  },
  {
    id: 'doc-020',
    name: 'Staff_Data_Protection_Training_Records.csv',
    type: 'CSV',
    folder: 'internal/training',
    sizeBytes: 185_000,
    tags: ['training', 'data-protection', 'gdpr', 'records'],
    uploadedBy: 'hr@cbabank.ng',
    uploadedAt: '2026-02-28T09:00:00Z',
    version: 1,
    retentionClass: 'INTERNAL',
    retentionUntil: '2031-02-28',
  },
];

const DEMO_OCR_QUEUE: OcrQueueItem[] = [
  {
    id: 'ocr-001',
    documentId: 'doc-001',
    documentName: 'National_ID_Card_Adeyemi_Kolawole.pdf',
    type: 'PDF',
    uploadedAt: '2025-11-10T09:14:00Z',
    pages: 2,
    status: 'VERIFIED',
    accuracy: 97.4,
    extractedText:
      'FEDERAL REPUBLIC OF NIGERIA\nNATIONAL IDENTITY MANAGEMENT COMMISSION\n\nSurname: KOLAWOLE\nFirst Name: ADEYEMI\nDate of Birth: 14/03/1988\nNIN: 12345678901\nGender: MALE\nIssue Date: 05/06/2020\nExpiry Date: 04/06/2030',
    lowConfidenceWords: [],
    processedAt: '2025-11-10T09:20:00Z',
  },
  {
    id: 'ocr-002',
    documentId: 'doc-002',
    documentName: 'Utility_Bill_March2025_Okonkwo.pdf',
    type: 'PDF',
    uploadedAt: '2025-12-02T11:30:00Z',
    pages: 3,
    status: 'COMPLETED',
    accuracy: 88.2,
    extractedText:
      'EKEDC - Eko Electricity Distribution Company\nAccount Number: 0123456789\nCustomer Name: CHIDI OKONKWO\nAddress: 14 Oyin Jolayemi Street, Victoria Island, Lagos\nBill Period: 01 March 2025 - 31 March 2025\nTotal Amount Due: ₦18,450.00\nDue Date: 15 April 2025',
    lowConfidenceWords: ['Jolayemi', '18,450'],
    processedAt: '2025-12-02T11:38:00Z',
  },
  {
    id: 'ocr-003',
    documentId: 'doc-006',
    documentName: 'Loan_Application_Form_LN-20250887.pdf',
    type: 'PDF',
    uploadedAt: '2025-10-05T10:00:00Z',
    pages: 8,
    status: 'PROCESSING',
    processedAt: undefined,
  },
  {
    id: 'ocr-004',
    documentId: 'doc-018',
    documentName: 'CAC_Certificate_Eze_Ventures_Ltd.pdf',
    type: 'PDF',
    uploadedAt: '2025-07-18T14:00:00Z',
    pages: 4,
    status: 'VERIFIED',
    accuracy: 95.1,
    extractedText:
      'CORPORATE AFFAIRS COMMISSION\nCertificate of Incorporation\n\nThis is to certify that EZE VENTURES LIMITED\nCompany Number: RC 1234567\nDate of Incorporation: 12th March 2018\nRegistered Office: 7 Commerce Road, Apapa, Lagos State',
    lowConfidenceWords: [],
    processedAt: '2025-07-18T14:10:00Z',
  },
  {
    id: 'ocr-005',
    documentId: 'doc-007',
    documentName: 'Property_Valuation_Report_Plot47_Lekki.pdf',
    type: 'PDF',
    uploadedAt: '2025-08-22T09:11:00Z',
    pages: 24,
    status: 'FAILED',
    processedAt: '2025-08-22T09:30:00Z',
  },
  {
    id: 'ocr-006',
    documentId: 'doc-017',
    documentName: 'Passport_Photo_Ngozi_Eze.jpg',
    type: 'IMAGE',
    uploadedAt: '2025-10-05T10:15:00Z',
    pages: 1,
    status: 'QUEUED',
  },
  {
    id: 'ocr-007',
    documentId: 'doc-010',
    documentName: 'CBN_CRR_Compliance_Q4_2025.pdf',
    type: 'PDF',
    uploadedAt: '2026-01-10T07:45:00Z',
    pages: 12,
    status: 'COMPLETED',
    accuracy: 91.7,
    extractedText:
      'CENTRAL BANK OF NIGERIA\nCASH RESERVE RATIO COMPLIANCE REPORT\nQ4 2025 - October to December 2025\n\nBank Name: CBA BANK LIMITED\nCBN License Number: CBN/BNK/0112\nReporting Period: 01 October 2025 - 31 December 2025\nCRR Rate: 45%\nTotal Deposits: ₦485,302,178,000\nRequired Reserve: ₦218,385,980,100\nActual Reserve Held: ₦221,042,000,000\nCompliance Status: COMPLIANT',
    lowConfidenceWords: ['₦218,385,980,100', '₦221,042,000,000'],
    processedAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'ocr-008',
    documentId: 'doc-019',
    documentName: 'Fixed_Deposit_Certificate_FD-20261002.pdf',
    type: 'PDF',
    uploadedAt: '2026-02-01T10:00:00Z',
    pages: 2,
    status: 'QUEUED',
  },
];

const DEMO_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-001',
    name: 'Welcome Letter',
    category: 'Customer Onboarding',
    description: 'Personalized welcome letter sent to new customers upon account opening.',
    mergeFields: ['customerName', 'accountNumber', 'accountType', 'branchName', 'openingDate', 'rmName'],
    lastGenerated: '2026-03-18T14:30:00Z',
    generatedCount: 1842,
  },
  {
    id: 'tpl-002',
    name: 'Account Statement',
    category: 'Account Management',
    description: 'Formal account statement for a specified period, suitable for official use.',
    mergeFields: ['customerName', 'accountNumber', 'statementPeriodFrom', 'statementPeriodTo', 'openingBalance', 'closingBalance', 'currency'],
    lastGenerated: '2026-03-19T08:00:00Z',
    generatedCount: 9403,
  },
  {
    id: 'tpl-003',
    name: 'Loan Offer Letter',
    category: 'Loan Management',
    description: 'Official loan offer detailing amount, tenor, interest rate, and repayment schedule.',
    mergeFields: ['customerName', 'loanRef', 'loanAmount', 'tenor', 'interestRate', 'monthlyRepayment', 'purposeOfLoan', 'approvalDate', 'expiryDate'],
    lastGenerated: '2026-03-17T11:20:00Z',
    generatedCount: 3218,
  },
  {
    id: 'tpl-004',
    name: 'Fixed Deposit Certificate',
    category: 'Deposits',
    description: 'Certificate confirming fixed deposit placement with maturity and interest details.',
    mergeFields: ['customerName', 'fdReference', 'principalAmount', 'interestRate', 'tenor', 'maturityDate', 'maturityAmount', 'valueDate'],
    lastGenerated: '2026-03-15T09:45:00Z',
    generatedCount: 7641,
  },
  {
    id: 'tpl-005',
    name: 'Reference Letter',
    category: 'Customer Correspondence',
    description: 'Bank reference letter confirming customer banking relationship and good standing.',
    mergeFields: ['customerName', 'accountNumber', 'bankingRelationshipSince', 'averageBalance', 'addressedTo', 'issuedDate'],
    lastGenerated: '2026-03-10T15:00:00Z',
    generatedCount: 2094,
  },
  {
    id: 'tpl-006',
    name: 'Account Confirmation Letter',
    category: 'Account Management',
    description: 'Confirmation of account details for embassy, NYSC, or other official purposes.',
    mergeFields: ['customerName', 'accountNumber', 'accountType', 'bvn', 'addressLine1', 'city', 'state', 'purposeOfLetter', 'issuedDate'],
    lastGenerated: '2026-03-12T10:30:00Z',
    generatedCount: 4507,
  },
];

const DEMO_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    id: 'ret-001',
    category: 'KYC',
    description: 'Know Your Customer identity and address verification documents',
    retentionYears: 10,
    autoDelete: false,
    archiveAfterYears: 7,
    regulatoryBasis: 'CBN AML/CFT Regulations 2022, Section 14(3)',
    documentCount: 5,
    expiringSoon: 0,
  },
  {
    id: 'ret-002',
    category: 'TRANSACTION',
    description: 'Transaction records, receipts, and payment confirmations',
    retentionYears: 7,
    autoDelete: false,
    archiveAfterYears: 5,
    regulatoryBasis: 'CBN Circular BSD/DIR/CON/LAB/06/031, CAMA 2020 Section 382',
    documentCount: 1,
    expiringSoon: 0,
  },
  {
    id: 'ret-003',
    category: 'LOAN',
    description: 'Loan application files, collateral documents, and legal agreements',
    retentionYears: 12,
    autoDelete: false,
    archiveAfterYears: 8,
    regulatoryBasis: 'CBN Prudential Guidelines for Banks, CAMA 2020 Section 382',
    documentCount: 3,
    expiringSoon: 0,
  },
  {
    id: 'ret-004',
    category: 'INTERNAL',
    description: 'Internal policies, procedures, training materials, and memos',
    retentionYears: 5,
    autoDelete: true,
    archiveAfterYears: 3,
    regulatoryBasis: 'Internal Records Management Policy v4.2',
    documentCount: 6,
    expiringSoon: 1,
  },
  {
    id: 'ret-005',
    category: 'REGULATORY',
    description: 'CBN returns, NDIC filings, and other regulatory submissions',
    retentionYears: 10,
    autoDelete: false,
    archiveAfterYears: 7,
    regulatoryBasis: 'CBN Supervisory Framework 2014, NDIC Act 2023 Section 45',
    documentCount: 3,
    expiringSoon: 0,
  },
  {
    id: 'ret-006',
    category: 'CORRESPONDENCE',
    description: 'Customer letters, agreements, complaints, and official correspondence',
    retentionYears: 7,
    autoDelete: false,
    archiveAfterYears: 5,
    regulatoryBasis: 'CBN Consumer Protection Regulations 2022, Section 22',
    documentCount: 3,
    expiringSoon: 2,
  },
];

// Mutable state for demo
let demoDocuments = [...DEMO_DOCUMENTS];

// ---- Helper ----

function delay(ms = 400) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---- API Functions ----

export async function getDocuments(folder?: DocumentFolder, search?: string): Promise<DocumentFile[]> {
  await delay(300);
  let results = [...demoDocuments];
  if (folder) results = results.filter((d) => d.folder === folder);
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.tags.some((t) => t.toLowerCase().includes(q)) ||
        d.entityName?.toLowerCase().includes(q),
    );
  }
  return results;
}

export async function getDocumentById(id: string): Promise<DocumentFile | null> {
  await delay(200);
  return demoDocuments.find((d) => d.id === id) ?? null;
}

export async function uploadDocument(
  file: File,
  folder: DocumentFolder,
  tags: string[] = [],
): Promise<DocumentFile> {
  await delay(800);
  const newDoc: DocumentFile = {
    id: `doc-${Date.now()}`,
    name: file.name,
    type: (file.name.split('.').pop()?.toUpperCase() as DocumentType) ?? 'PDF',
    folder,
    sizeBytes: file.size,
    tags,
    uploadedBy: 'current.user@cbabank.ng',
    uploadedAt: new Date().toISOString(),
    version: 1,
    retentionClass: 'INTERNAL',
  };
  demoDocuments = [newDoc, ...demoDocuments];
  return newDoc;
}

export async function deleteDocument(id: string): Promise<void> {
  await delay(400);
  demoDocuments = demoDocuments.filter((d) => d.id !== id);
}

export async function updateDocumentTags(id: string, tags: string[]): Promise<DocumentFile> {
  await delay(300);
  demoDocuments = demoDocuments.map((d) => (d.id === id ? { ...d, tags } : d));
  return demoDocuments.find((d) => d.id === id)!;
}

export async function linkToEntity(
  id: string,
  entityType: string,
  entityId: string,
): Promise<DocumentFile> {
  await delay(400);
  demoDocuments = demoDocuments.map((d) => (d.id === id ? { ...d, entityType, entityId } : d));
  return demoDocuments.find((d) => d.id === id)!;
}

let ocrQueue = [...DEMO_OCR_QUEUE];

export async function getOcrQueue(): Promise<OcrQueueItem[]> {
  await delay(300);
  return [...ocrQueue];
}

export async function getOcrItem(id: string): Promise<OcrQueueItem | null> {
  await delay(200);
  return ocrQueue.find((i) => i.id === id) ?? null;
}

export async function submitOcrCorrection(id: string, correctedText: string): Promise<OcrQueueItem> {
  await delay(400);
  ocrQueue = ocrQueue.map((i) =>
    i.id === id ? { ...i, extractedText: correctedText } : i,
  );
  return ocrQueue.find((i) => i.id === id)!;
}

export async function verifyOcrItem(id: string): Promise<OcrQueueItem> {
  await delay(400);
  ocrQueue = ocrQueue.map((i) =>
    i.id === id ? { ...i, status: 'VERIFIED' as OcrStatus, processedAt: new Date().toISOString() } : i,
  );
  return ocrQueue.find((i) => i.id === id)!;
}

export async function getDocumentTemplates(): Promise<DocumentTemplate[]> {
  await delay(300);
  return [...DEMO_TEMPLATES];
}

export async function generateFromTemplate(
  templateId: string,
  entityId: string,
  entityType: string,
): Promise<{ downloadUrl: string; documentId: string }> {
  await delay(1200);
  return {
    downloadUrl: `/mock-download/generated-${templateId}-${entityId}.pdf`,
    documentId: `doc-gen-${Date.now()}`,
  };
}

let retentionPolicies = [...DEMO_RETENTION_POLICIES];

export async function getRetentionPolicies(): Promise<RetentionPolicy[]> {
  await delay(300);
  return [...retentionPolicies];
}

export async function updateRetentionPolicy(
  id: string,
  data: Partial<RetentionPolicy>,
): Promise<RetentionPolicy> {
  await delay(500);
  retentionPolicies = retentionPolicies.map((p) => (p.id === id ? { ...p, ...data } : p));
  return retentionPolicies.find((p) => p.id === id)!;
}

export async function runRetentionCheck(): Promise<{ expiredCount: number; archivedCount: number; message: string }> {
  await delay(2000);
  return {
    expiredCount: 3,
    archivedCount: 12,
    message: '3 documents past retention period identified. 12 documents archived automatically.',
  };
}
