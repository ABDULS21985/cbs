export type ApprovalType =
  | 'ACCOUNT_OPENING' | 'LOAN_APPROVAL' | 'PAYMENT_APPROVAL' | 'FEE_WAIVER'
  | 'RATE_OVERRIDE' | 'PARAMETER_CHANGE' | 'USER_CREATION' | 'CARD_REQUEST'
  | 'WRITE_OFF' | 'RESTRUCTURE' | 'LIMIT_CHANGE' | 'KYC_OVERRIDE';

export type ApprovalPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'DELEGATED' | 'ESCALATED';

export interface ApprovalRequest {
  id: string;
  requestNumber: string;
  type: ApprovalType;
  description: string;
  requestedBy: string;
  requestedByRole: string;
  amount?: number;
  currency?: string;
  priority: ApprovalPriority;
  submittedAt: string;
  slaDeadline: string;
  slaHours: number;
  status: ApprovalStatus;
  assignedTo: string;
  entityId?: string;
  entityType?: string;
  comments?: ApprovalComment[];
  approvalChain?: ApprovalChainStep[];
  documents?: string[];
}

export interface ApprovalComment {
  id: string;
  by: string;
  role: string;
  text: string;
  action: 'COMMENT' | 'APPROVE' | 'REJECT' | 'RETURN' | 'DELEGATE';
  timestamp: string;
}

export interface ApprovalChainStep {
  level: number;
  approver: string;
  role: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  timestamp?: string;
  comments?: string;
}

export interface Delegation {
  id: string;
  delegatedBy: string;
  delegatedTo: string;
  delegatedToRole: string;
  fromDate: string;
  toDate: string;
  scope: 'ALL' | 'SPECIFIC';
  types?: ApprovalType[];
  reason: string;
  active: boolean;
  createdAt: string;
}

export interface EscalationRule {
  id: string;
  type: ApprovalType | 'ALL';
  escalateAfterHours: number;
  notifyAfterHours: number;
  escalateTo: string;
  active: boolean;
}

// ---- Mock Data ----

const now = new Date('2026-03-19T10:00:00');

function hoursAgo(h: number): string {
  return new Date(now.getTime() - h * 3600_000).toISOString();
}
function hoursFromNow(h: number): string {
  return new Date(now.getTime() + h * 3600_000).toISOString();
}

const MOCK_APPROVALS: ApprovalRequest[] = [
  {
    id: 'apr-001',
    requestNumber: 'APR-2026-001234',
    type: 'LOAN_APPROVAL',
    description: 'Term loan facility for Dangote Agro Ltd – ₦250M at 18.5% p.a.',
    requestedBy: 'Emeka Okonkwo',
    requestedByRole: 'Relationship Manager',
    amount: 250_000_000,
    currency: 'NGN',
    priority: 'CRITICAL',
    submittedAt: hoursAgo(10),
    slaDeadline: hoursAgo(2),
    slaHours: 8,
    status: 'PENDING',
    assignedTo: 'Ngozi Adeyemi',
    entityId: 'CUST-009821',
    entityType: 'CUSTOMER',
    documents: ['CreditAppraisal_DangoteAgro.pdf', 'FinancialStatements_2025.pdf', 'BoardResolution.pdf'],
    approvalChain: [
      { level: 1, approver: 'Emeka Okonkwo', role: 'Relationship Manager', status: 'APPROVED', timestamp: hoursAgo(10), comments: 'Full documentation provided.' },
      { level: 2, approver: 'Chidi Nwachukwu', role: 'Credit Analyst', status: 'APPROVED', timestamp: hoursAgo(8), comments: 'Risk grade B+, within policy.' },
      { level: 3, approver: 'Ngozi Adeyemi', role: 'Branch Credit Manager', status: 'PENDING' },
      { level: 4, approver: 'Fatima Bello', role: 'Regional Credit Head', status: 'PENDING' },
    ],
    comments: [
      { id: 'c1', by: 'Emeka Okonkwo', role: 'Relationship Manager', text: 'Customer has been with us 7 years, excellent repayment history.', action: 'COMMENT', timestamp: hoursAgo(10) },
      { id: 'c2', by: 'Chidi Nwachukwu', role: 'Credit Analyst', text: 'Approved at credit level. Recommend proceeding.', action: 'APPROVE', timestamp: hoursAgo(8) },
    ],
  },
  {
    id: 'apr-002',
    requestNumber: 'APR-2026-001235',
    type: 'PAYMENT_APPROVAL',
    description: 'Bulk salary payment – First Guaranty Insurance – 342 beneficiaries',
    requestedBy: 'Adaeze Nwosu',
    requestedByRole: 'Operations Officer',
    amount: 48_320_000,
    currency: 'NGN',
    priority: 'HIGH',
    submittedAt: hoursAgo(3),
    slaDeadline: hoursFromNow(1),
    slaHours: 4,
    status: 'PENDING',
    assignedTo: 'Ngozi Adeyemi',
    entityId: 'ACC-0019283',
    entityType: 'ACCOUNT',
    documents: ['SalarySchedule_March2026.xlsx', 'AuthorizationLetter.pdf'],
    approvalChain: [
      { level: 1, approver: 'Adaeze Nwosu', role: 'Operations Officer', status: 'APPROVED', timestamp: hoursAgo(3) },
      { level: 2, approver: 'Ngozi Adeyemi', role: 'Branch Credit Manager', status: 'PENDING' },
    ],
    comments: [],
  },
  {
    id: 'apr-003',
    requestNumber: 'APR-2026-001236',
    type: 'ACCOUNT_OPENING',
    description: 'Corporate account – Zenith Petroleum Ltd – SME Current Account',
    requestedBy: 'Babatunde Fasanya',
    requestedByRole: 'Customer Service Officer',
    priority: 'NORMAL',
    submittedAt: hoursAgo(5),
    slaDeadline: hoursFromNow(7),
    slaHours: 12,
    status: 'PENDING',
    assignedTo: 'Ngozi Adeyemi',
    entityId: 'CUST-009830',
    entityType: 'CUSTOMER',
    documents: ['CAC_Certificate.pdf', 'MemorandumOfAssociation.pdf', 'DirectorIDs.pdf'],
    approvalChain: [
      { level: 1, approver: 'Babatunde Fasanya', role: 'Customer Service Officer', status: 'APPROVED', timestamp: hoursAgo(5) },
      { level: 2, approver: 'Ngozi Adeyemi', role: 'Branch Manager', status: 'PENDING' },
    ],
    comments: [],
  },
  {
    id: 'apr-004',
    requestNumber: 'APR-2026-001237',
    type: 'FEE_WAIVER',
    description: 'COT fee waiver for Q1 2026 – Abubakar Motors Ltd',
    requestedBy: 'Yetunde Olatunji',
    requestedByRole: 'Relationship Manager',
    amount: 124_500,
    currency: 'NGN',
    priority: 'NORMAL',
    submittedAt: hoursAgo(18),
    slaDeadline: hoursAgo(6),
    slaHours: 12,
    status: 'PENDING',
    assignedTo: 'Ngozi Adeyemi',
    entityId: 'ACC-0028471',
    entityType: 'ACCOUNT',
    documents: ['WaiverRequest_AbubakarMotors.pdf'],
    approvalChain: [
      { level: 1, approver: 'Yetunde Olatunji', role: 'Relationship Manager', status: 'APPROVED', timestamp: hoursAgo(18) },
      { level: 2, approver: 'Ngozi Adeyemi', role: 'Branch Manager', status: 'PENDING' },
    ],
    comments: [
      { id: 'c3', by: 'Yetunde Olatunji', role: 'Relationship Manager', text: 'Customer threatening to move account. Strategic waiver recommended.', action: 'COMMENT', timestamp: hoursAgo(18) },
    ],
  },
  {
    id: 'apr-005',
    requestNumber: 'APR-2026-001238',
    type: 'RATE_OVERRIDE',
    description: 'Interest rate override – Savings account – Preferred client tier',
    requestedBy: 'Oluwaseun Adekola',
    requestedByRole: 'Relationship Manager',
    priority: 'HIGH',
    submittedAt: hoursAgo(2),
    slaDeadline: hoursFromNow(6),
    slaHours: 8,
    status: 'PENDING',
    assignedTo: 'Fatima Bello',
    entityId: 'ACC-0031920',
    entityType: 'ACCOUNT',
    documents: ['RateOverrideJustification.pdf'],
    approvalChain: [
      { level: 1, approver: 'Oluwaseun Adekola', role: 'Relationship Manager', status: 'APPROVED', timestamp: hoursAgo(2) },
      { level: 2, approver: 'Fatima Bello', role: 'Regional Credit Head', status: 'PENDING' },
    ],
    comments: [],
  },
  {
    id: 'apr-006',
    requestNumber: 'APR-2026-001239',
    type: 'USER_CREATION',
    description: 'New teller user account – Ikeja Branch – Chisom Eze',
    requestedBy: 'Adeyemi Johnson',
    requestedByRole: 'Branch Manager',
    priority: 'NORMAL',
    submittedAt: hoursAgo(6),
    slaDeadline: hoursFromNow(18),
    slaHours: 24,
    status: 'PENDING',
    assignedTo: 'IT Admin Team',
    entityId: 'USR-NEW-0082',
    entityType: 'USER',
    documents: ['HROnboardingForm.pdf', 'EmploymentLetter.pdf'],
    approvalChain: [
      { level: 1, approver: 'Adeyemi Johnson', role: 'Branch Manager', status: 'APPROVED', timestamp: hoursAgo(6) },
      { level: 2, approver: 'IT Admin Team', role: 'System Administrator', status: 'PENDING' },
    ],
    comments: [],
  },
  {
    id: 'apr-007',
    requestNumber: 'APR-2026-001240',
    type: 'CARD_REQUEST',
    description: 'Platinum debit card issuance – Amaka Obi – Priority Banking',
    requestedBy: 'Taiwo Adesanya',
    requestedByRole: 'Customer Service Officer',
    priority: 'LOW',
    submittedAt: hoursAgo(4),
    slaDeadline: hoursFromNow(20),
    slaHours: 24,
    status: 'PENDING',
    assignedTo: 'Cards Operations',
    entityId: 'CUST-004521',
    entityType: 'CUSTOMER',
    documents: ['CardRequestForm.pdf'],
    approvalChain: [
      { level: 1, approver: 'Taiwo Adesanya', role: 'Customer Service Officer', status: 'APPROVED', timestamp: hoursAgo(4) },
      { level: 2, approver: 'Cards Operations', role: 'Cards Supervisor', status: 'PENDING' },
    ],
    comments: [],
  },
  {
    id: 'apr-008',
    requestNumber: 'APR-2026-001241',
    type: 'WRITE_OFF',
    description: 'Loan write-off – NPL account – Tunde Bakare Ventures – ₦8.2M',
    requestedBy: 'Nkechi Okafor',
    requestedByRole: 'Collections Officer',
    amount: 8_200_000,
    currency: 'NGN',
    priority: 'CRITICAL',
    submittedAt: hoursAgo(30),
    slaDeadline: hoursAgo(6),
    slaHours: 24,
    status: 'ESCALATED',
    assignedTo: 'Chukwuemeka Eze',
    entityId: 'LOAN-00394',
    entityType: 'LOAN',
    documents: ['NPLCertification.pdf', 'LegalOpinion.pdf', 'WriteOffApprovalForm.pdf'],
    approvalChain: [
      { level: 1, approver: 'Nkechi Okafor', role: 'Collections Officer', status: 'APPROVED', timestamp: hoursAgo(30) },
      { level: 2, approver: 'Kola Adebayo', role: 'Head of Collections', status: 'APPROVED', timestamp: hoursAgo(24) },
      { level: 3, approver: 'Chukwuemeka Eze', role: 'Chief Risk Officer', status: 'PENDING' },
    ],
    comments: [
      { id: 'c4', by: 'Nkechi Okafor', role: 'Collections Officer', text: 'All recovery options exhausted. 3-year NPL.', action: 'COMMENT', timestamp: hoursAgo(30) },
      { id: 'c5', by: 'Kola Adebayo', role: 'Head of Collections', text: 'Approved for write-off. Escalating to CRO.', action: 'APPROVE', timestamp: hoursAgo(24) },
    ],
  },
  {
    id: 'apr-009',
    requestNumber: 'APR-2026-001242',
    type: 'RESTRUCTURE',
    description: 'Loan restructure – Okeke Farms Ltd – 24-month tenor extension',
    requestedBy: 'Emeka Okonkwo',
    requestedByRole: 'Relationship Manager',
    amount: 45_000_000,
    currency: 'NGN',
    priority: 'HIGH',
    submittedAt: hoursAgo(12),
    slaDeadline: hoursFromNow(12),
    slaHours: 24,
    status: 'PENDING',
    assignedTo: 'Ngozi Adeyemi',
    entityId: 'LOAN-00287',
    entityType: 'LOAN',
    documents: ['RestructureProposal.pdf', 'CashFlowProjections.pdf'],
    approvalChain: [
      { level: 1, approver: 'Emeka Okonkwo', role: 'Relationship Manager', status: 'APPROVED', timestamp: hoursAgo(12) },
      { level: 2, approver: 'Chidi Nwachukwu', role: 'Credit Analyst', status: 'APPROVED', timestamp: hoursAgo(9) },
      { level: 3, approver: 'Ngozi Adeyemi', role: 'Branch Credit Manager', status: 'PENDING' },
    ],
    comments: [
      { id: 'c6', by: 'Chidi Nwachukwu', role: 'Credit Analyst', text: 'Restructure justified. COVID-19 impact lingering.', action: 'APPROVE', timestamp: hoursAgo(9) },
    ],
  },
  {
    id: 'apr-010',
    requestNumber: 'APR-2026-001243',
    type: 'LIMIT_CHANGE',
    description: 'Credit limit increase – Zenith Petroleum – Overdraft from ₦10M to ₦25M',
    requestedBy: 'Oluwaseun Adekola',
    requestedByRole: 'Relationship Manager',
    amount: 25_000_000,
    currency: 'NGN',
    priority: 'HIGH',
    submittedAt: hoursAgo(7),
    slaDeadline: hoursFromNow(1),
    slaHours: 8,
    status: 'PENDING',
    assignedTo: 'Fatima Bello',
    entityId: 'ACC-0019283',
    entityType: 'ACCOUNT',
    documents: ['LimitIncreaseFD.pdf'],
    approvalChain: [
      { level: 1, approver: 'Oluwaseun Adekola', role: 'Relationship Manager', status: 'APPROVED', timestamp: hoursAgo(7) },
      { level: 2, approver: 'Fatima Bello', role: 'Regional Credit Head', status: 'PENDING' },
    ],
    comments: [],
  },
  {
    id: 'apr-011',
    requestNumber: 'APR-2026-001244',
    type: 'KYC_OVERRIDE',
    description: 'KYC exception – PEP classification override – Ambassador Uche Obi',
    requestedBy: 'Babatunde Fasanya',
    requestedByRole: 'Customer Service Officer',
    priority: 'CRITICAL',
    submittedAt: hoursAgo(2),
    slaDeadline: hoursFromNow(6),
    slaHours: 8,
    status: 'PENDING',
    assignedTo: 'Compliance Team',
    entityId: 'CUST-009931',
    entityType: 'CUSTOMER',
    documents: ['PEP_Declaration.pdf', 'EnhancedDueDiligence.pdf'],
    approvalChain: [
      { level: 1, approver: 'Babatunde Fasanya', role: 'Customer Service Officer', status: 'APPROVED', timestamp: hoursAgo(2) },
      { level: 2, approver: 'Compliance Team', role: 'Compliance Officer', status: 'PENDING' },
      { level: 3, approver: 'MLRO', role: 'Chief Compliance Officer', status: 'PENDING' },
    ],
    comments: [],
  },
  {
    id: 'apr-012',
    requestNumber: 'APR-2026-001245',
    type: 'PARAMETER_CHANGE',
    description: 'System parameter update – NIBSS transfer limit – ₦5M to ₦10M',
    requestedBy: 'Chukwuemeka Eze',
    requestedByRole: 'Head of IT Operations',
    priority: 'CRITICAL',
    submittedAt: hoursAgo(1),
    slaDeadline: hoursFromNow(7),
    slaHours: 8,
    status: 'PENDING',
    assignedTo: 'MD Office',
    documents: ['ParameterChangeRequest.pdf', 'RegulatoryApproval_CBN.pdf'],
    approvalChain: [
      { level: 1, approver: 'Chukwuemeka Eze', role: 'Head of IT Operations', status: 'APPROVED', timestamp: hoursAgo(1) },
      { level: 2, approver: 'MD Office', role: 'MD/CEO', status: 'PENDING' },
    ],
    comments: [],
  },
  {
    id: 'apr-013',
    requestNumber: 'APR-2026-001220',
    type: 'LOAN_APPROVAL',
    description: 'SME loan – Chinyere Fashion Hub – ₦5M working capital',
    requestedBy: 'Adaeze Nwosu',
    requestedByRole: 'Relationship Manager',
    amount: 5_000_000,
    currency: 'NGN',
    priority: 'NORMAL',
    submittedAt: hoursAgo(48),
    slaDeadline: hoursAgo(40),
    slaHours: 8,
    status: 'APPROVED',
    assignedTo: 'Ngozi Adeyemi',
    entityId: 'CUST-009700',
    entityType: 'CUSTOMER',
    documents: ['LoanApplication.pdf', 'BusinessPlan.pdf'],
    approvalChain: [
      { level: 1, approver: 'Adaeze Nwosu', role: 'Relationship Manager', status: 'APPROVED', timestamp: hoursAgo(48) },
      { level: 2, approver: 'Ngozi Adeyemi', role: 'Branch Credit Manager', status: 'APPROVED', timestamp: hoursAgo(40) },
    ],
    comments: [
      { id: 'c7', by: 'Ngozi Adeyemi', role: 'Branch Credit Manager', text: 'Approved. Good repayment record.', action: 'APPROVE', timestamp: hoursAgo(40) },
    ],
  },
  {
    id: 'apr-014',
    requestNumber: 'APR-2026-001218',
    type: 'PAYMENT_APPROVAL',
    description: 'International wire transfer – Kano Rice Ltd – $240,000 to Dubai',
    requestedBy: 'Yetunde Olatunji',
    requestedByRole: 'Operations Officer',
    amount: 240_000,
    currency: 'USD',
    priority: 'HIGH',
    submittedAt: hoursAgo(50),
    slaDeadline: hoursAgo(46),
    slaHours: 4,
    status: 'REJECTED',
    assignedTo: 'Fatima Bello',
    entityId: 'ACC-0039010',
    entityType: 'ACCOUNT',
    documents: ['SwiftInstructions.pdf', 'TradeLicense.pdf'],
    approvalChain: [
      { level: 1, approver: 'Yetunde Olatunji', role: 'Operations Officer', status: 'APPROVED', timestamp: hoursAgo(50) },
      { level: 2, approver: 'Fatima Bello', role: 'Regional Credit Head', status: 'REJECTED', timestamp: hoursAgo(46), comments: 'Insufficient documentation for CBN compliance.' },
    ],
    comments: [
      { id: 'c8', by: 'Fatima Bello', role: 'Regional Credit Head', text: 'Missing Form M approval. Request rejected.', action: 'REJECT', timestamp: hoursAgo(46) },
    ],
  },
  {
    id: 'apr-015',
    requestNumber: 'APR-2026-001210',
    type: 'FEE_WAIVER',
    description: 'Annual maintenance fee waiver – VIP client – Chief Emeka Obi',
    requestedBy: 'Taiwo Adesanya',
    requestedByRole: 'Relationship Manager',
    amount: 50_000,
    currency: 'NGN',
    priority: 'LOW',
    submittedAt: hoursAgo(72),
    slaDeadline: hoursAgo(60),
    slaHours: 12,
    status: 'APPROVED',
    assignedTo: 'Ngozi Adeyemi',
    entityId: 'ACC-0012341',
    entityType: 'ACCOUNT',
    documents: ['WaiverRequest.pdf'],
    approvalChain: [
      { level: 1, approver: 'Taiwo Adesanya', role: 'Relationship Manager', status: 'APPROVED', timestamp: hoursAgo(72) },
      { level: 2, approver: 'Ngozi Adeyemi', role: 'Branch Manager', status: 'APPROVED', timestamp: hoursAgo(60) },
    ],
    comments: [
      { id: 'c9', by: 'Ngozi Adeyemi', role: 'Branch Manager', text: 'Approved for VIP retention.', action: 'APPROVE', timestamp: hoursAgo(60) },
    ],
  },
  {
    id: 'apr-016',
    requestNumber: 'APR-2026-001246',
    type: 'ACCOUNT_OPENING',
    description: 'Individual savings account – Blessing Okonkwo – Retail Banking',
    requestedBy: 'Chisom Eze',
    requestedByRole: 'Customer Service Officer',
    priority: 'LOW',
    submittedAt: hoursAgo(1),
    slaDeadline: hoursFromNow(23),
    slaHours: 24,
    status: 'PENDING',
    assignedTo: 'Ngozi Adeyemi',
    entityId: 'CUST-NEW-0291',
    entityType: 'CUSTOMER',
    documents: ['NIN_Slip.pdf', 'UtilityBill.pdf', 'PassportPhoto.jpg'],
    approvalChain: [
      { level: 1, approver: 'Chisom Eze', role: 'Customer Service Officer', status: 'APPROVED', timestamp: hoursAgo(1) },
      { level: 2, approver: 'Ngozi Adeyemi', role: 'Branch Manager', status: 'PENDING' },
    ],
    comments: [],
  },
  {
    id: 'apr-017',
    requestNumber: 'APR-2026-001247',
    type: 'LOAN_APPROVAL',
    description: 'Mortgage loan – Adebayo Segun – ₦85M – 20yr term',
    requestedBy: 'Emeka Okonkwo',
    requestedByRole: 'Mortgage Officer',
    amount: 85_000_000,
    currency: 'NGN',
    priority: 'HIGH',
    submittedAt: hoursAgo(6),
    slaDeadline: hoursFromNow(2),
    slaHours: 8,
    status: 'PENDING',
    assignedTo: 'Ngozi Adeyemi',
    entityId: 'CUST-009845',
    entityType: 'CUSTOMER',
    documents: ['MortgageApplication.pdf', 'PropertyValuation.pdf', 'TitleDeed.pdf'],
    approvalChain: [
      { level: 1, approver: 'Emeka Okonkwo', role: 'Mortgage Officer', status: 'APPROVED', timestamp: hoursAgo(6) },
      { level: 2, approver: 'Ngozi Adeyemi', role: 'Branch Credit Manager', status: 'PENDING' },
      { level: 3, approver: 'Fatima Bello', role: 'Head of Mortgages', status: 'PENDING' },
    ],
    comments: [],
  },
  {
    id: 'apr-018',
    requestNumber: 'APR-2026-001248',
    type: 'RESTRUCTURE',
    description: 'Loan restructure – NigerPower Ventures – moratorium 6 months',
    requestedBy: 'Nkechi Okafor',
    requestedByRole: 'Relationship Manager',
    amount: 120_000_000,
    currency: 'NGN',
    priority: 'CRITICAL',
    submittedAt: hoursAgo(20),
    slaDeadline: hoursAgo(4),
    slaHours: 16,
    status: 'RETURNED',
    assignedTo: 'Nkechi Okafor',
    entityId: 'LOAN-00410',
    entityType: 'LOAN',
    documents: ['RestructureRequest.pdf'],
    approvalChain: [
      { level: 1, approver: 'Nkechi Okafor', role: 'Relationship Manager', status: 'APPROVED', timestamp: hoursAgo(20) },
      { level: 2, approver: 'Chukwuemeka Eze', role: 'Chief Risk Officer', status: 'REJECTED', timestamp: hoursAgo(4), comments: 'Insufficient collateral coverage for restructure.' },
    ],
    comments: [
      { id: 'c10', by: 'Chukwuemeka Eze', role: 'Chief Risk Officer', text: 'Return for amendment. Need additional collateral pledging.', action: 'RETURN', timestamp: hoursAgo(4) },
    ],
  },
  {
    id: 'apr-019',
    requestNumber: 'APR-2026-001249',
    type: 'PAYMENT_APPROVAL',
    description: 'Interbank transfer – Agro Trust Nigeria – ₦32.5M to GTB',
    requestedBy: 'Babatunde Fasanya',
    requestedByRole: 'Operations Officer',
    amount: 32_500_000,
    currency: 'NGN',
    priority: 'HIGH',
    submittedAt: hoursAgo(1.5),
    slaDeadline: hoursFromNow(2.5),
    slaHours: 4,
    status: 'PENDING',
    assignedTo: 'Fatima Bello',
    entityId: 'ACC-0041209',
    entityType: 'ACCOUNT',
    documents: ['TransferInstruction.pdf'],
    approvalChain: [
      { level: 1, approver: 'Babatunde Fasanya', role: 'Operations Officer', status: 'APPROVED', timestamp: hoursAgo(1.5) },
      { level: 2, approver: 'Fatima Bello', role: 'Regional Credit Head', status: 'PENDING' },
    ],
    comments: [],
  },
  {
    id: 'apr-020',
    requestNumber: 'APR-2026-001250',
    type: 'CARD_REQUEST',
    description: 'Virtual card request – Naira MasterCard – Chukwuemeka Eze',
    requestedBy: 'Adaeze Nwosu',
    requestedByRole: 'Cards Officer',
    priority: 'LOW',
    submittedAt: hoursAgo(3),
    slaDeadline: hoursFromNow(21),
    slaHours: 24,
    status: 'DELEGATED',
    assignedTo: 'Cards Operations',
    entityId: 'CUST-008201',
    entityType: 'CUSTOMER',
    documents: ['CardRequestForm.pdf'],
    approvalChain: [
      { level: 1, approver: 'Adaeze Nwosu', role: 'Cards Officer', status: 'APPROVED', timestamp: hoursAgo(3) },
      { level: 2, approver: 'Cards Operations', role: 'Cards Supervisor', status: 'PENDING' },
    ],
    comments: [
      { id: 'c11', by: 'Adaeze Nwosu', role: 'Cards Officer', text: 'Delegated to Cards Operations team.', action: 'DELEGATE', timestamp: hoursAgo(2) },
    ],
  },
  {
    id: 'apr-021',
    requestNumber: 'APR-2026-001251',
    type: 'LIMIT_CHANGE',
    description: 'Daily transfer limit reduction – Fraud risk – ACC-0048221',
    requestedBy: 'Fraud Team',
    requestedByRole: 'Fraud Analyst',
    priority: 'CRITICAL',
    submittedAt: hoursAgo(0.5),
    slaDeadline: hoursFromNow(3.5),
    slaHours: 4,
    status: 'PENDING',
    assignedTo: 'Compliance Team',
    entityId: 'ACC-0048221',
    entityType: 'ACCOUNT',
    documents: ['FraudAlert_Report.pdf'],
    approvalChain: [
      { level: 1, approver: 'Fraud Team', role: 'Fraud Analyst', status: 'APPROVED', timestamp: hoursAgo(0.5) },
      { level: 2, approver: 'Compliance Team', role: 'Head of Compliance', status: 'PENDING' },
    ],
    comments: [],
  },
  {
    id: 'apr-022',
    requestNumber: 'APR-2026-001252',
    type: 'KYC_OVERRIDE',
    description: 'KYC documentation exception – expired passport – Hajiya Zainab Sule',
    requestedBy: 'Chisom Eze',
    requestedByRole: 'Customer Service Officer',
    priority: 'NORMAL',
    submittedAt: hoursAgo(8),
    slaDeadline: hoursFromNow(4),
    slaHours: 12,
    status: 'PENDING',
    assignedTo: 'Compliance Team',
    entityId: 'CUST-007821',
    entityType: 'CUSTOMER',
    documents: ['ExpiredPassport.pdf', 'NIN_Verification.pdf'],
    approvalChain: [
      { level: 1, approver: 'Chisom Eze', role: 'Customer Service Officer', status: 'APPROVED', timestamp: hoursAgo(8) },
      { level: 2, approver: 'Compliance Team', role: 'Compliance Officer', status: 'PENDING' },
    ],
    comments: [],
  },
  {
    id: 'apr-023',
    requestNumber: 'APR-2026-001253',
    type: 'RATE_OVERRIDE',
    description: 'Deposit rate override – 30-day fixed deposit – 14% (above standard)',
    requestedBy: 'Yetunde Olatunji',
    requestedByRole: 'Relationship Manager',
    priority: 'HIGH',
    submittedAt: hoursAgo(4),
    slaDeadline: hoursFromNow(4),
    slaHours: 8,
    status: 'PENDING',
    assignedTo: 'Fatima Bello',
    entityId: 'ACC-0029810',
    entityType: 'ACCOUNT',
    documents: ['RateOverrideForm.pdf'],
    approvalChain: [
      { level: 1, approver: 'Yetunde Olatunji', role: 'Relationship Manager', status: 'APPROVED', timestamp: hoursAgo(4) },
      { level: 2, approver: 'Fatima Bello', role: 'Regional Credit Head', status: 'PENDING' },
    ],
    comments: [],
  },
  {
    id: 'apr-024',
    requestNumber: 'APR-2026-001254',
    type: 'WRITE_OFF',
    description: 'Partial write-off – Okoye Builders Ltd – ₦2.1M interest component',
    requestedBy: 'Nkechi Okafor',
    requestedByRole: 'Collections Officer',
    amount: 2_100_000,
    currency: 'NGN',
    priority: 'HIGH',
    submittedAt: hoursAgo(14),
    slaDeadline: hoursFromNow(10),
    slaHours: 24,
    status: 'PENDING',
    assignedTo: 'Chukwuemeka Eze',
    entityId: 'LOAN-00391',
    entityType: 'LOAN',
    documents: ['PartialWriteOffRequest.pdf', 'LegalClearance.pdf'],
    approvalChain: [
      { level: 1, approver: 'Nkechi Okafor', role: 'Collections Officer', status: 'APPROVED', timestamp: hoursAgo(14) },
      { level: 2, approver: 'Kola Adebayo', role: 'Head of Collections', status: 'APPROVED', timestamp: hoursAgo(10) },
      { level: 3, approver: 'Chukwuemeka Eze', role: 'Chief Risk Officer', status: 'PENDING' },
    ],
    comments: [
      { id: 'c12', by: 'Kola Adebayo', role: 'Head of Collections', text: 'Partial write-off recommended. CRO sign-off needed.', action: 'APPROVE', timestamp: hoursAgo(10) },
    ],
  },
  {
    id: 'apr-025',
    requestNumber: 'APR-2026-001255',
    type: 'PARAMETER_CHANGE',
    description: 'Penalty rate parameter update – Late loan repayment – 3% to 5%',
    requestedBy: 'Oluwaseun Adekola',
    requestedByRole: 'Head of Credit Risk',
    priority: 'NORMAL',
    submittedAt: hoursAgo(16),
    slaDeadline: hoursFromNow(8),
    slaHours: 24,
    status: 'PENDING',
    assignedTo: 'MD Office',
    documents: ['ParameterChangeMemo.pdf', 'BoardApproval.pdf'],
    approvalChain: [
      { level: 1, approver: 'Oluwaseun Adekola', role: 'Head of Credit Risk', status: 'APPROVED', timestamp: hoursAgo(16) },
      { level: 2, approver: 'MD Office', role: 'MD/CEO', status: 'PENDING' },
    ],
    comments: [],
  },
];

const MOCK_DELEGATIONS: Delegation[] = [
  {
    id: 'del-001',
    delegatedBy: 'Ngozi Adeyemi',
    delegatedTo: 'Chidi Nwachukwu',
    delegatedToRole: 'Senior Credit Analyst',
    fromDate: '2026-03-18',
    toDate: '2026-03-22',
    scope: 'SPECIFIC',
    types: ['LOAN_APPROVAL', 'FEE_WAIVER', 'ACCOUNT_OPENING'],
    reason: 'Annual Leave',
    active: true,
    createdAt: hoursAgo(48),
  },
  {
    id: 'del-002',
    delegatedBy: 'Fatima Bello',
    delegatedTo: 'Taiwo Adesanya',
    delegatedToRole: 'Senior Relationship Manager',
    fromDate: '2026-03-19',
    toDate: '2026-03-21',
    scope: 'SPECIFIC',
    types: ['PAYMENT_APPROVAL', 'RATE_OVERRIDE'],
    reason: 'Business Travel',
    active: true,
    createdAt: hoursAgo(24),
  },
  {
    id: 'del-003',
    delegatedBy: 'Chukwuemeka Eze',
    delegatedTo: 'Kola Adebayo',
    delegatedToRole: 'Head of Collections',
    fromDate: '2026-03-19',
    toDate: '2026-03-19',
    scope: 'ALL',
    reason: 'Training',
    active: true,
    createdAt: hoursAgo(12),
  },
  {
    id: 'del-004',
    delegatedBy: 'Ngozi Adeyemi',
    delegatedTo: 'Babatunde Fasanya',
    delegatedToRole: 'Branch Operations Manager',
    fromDate: '2026-03-10',
    toDate: '2026-03-14',
    scope: 'ALL',
    reason: 'Annual Leave',
    active: false,
    createdAt: '2026-03-09T08:00:00',
  },
  {
    id: 'del-005',
    delegatedBy: 'Fatima Bello',
    delegatedTo: 'Emeka Okonkwo',
    delegatedToRole: 'Senior Relationship Manager',
    fromDate: '2026-03-01',
    toDate: '2026-03-05',
    scope: 'SPECIFIC',
    types: ['LOAN_APPROVAL', 'RESTRUCTURE'],
    reason: 'Business Travel',
    active: false,
    createdAt: '2026-02-28T14:30:00',
  },
];

const MOCK_ESCALATION_RULES: EscalationRule[] = [
  { id: 'esc-001', type: 'ALL', escalateAfterHours: 24, notifyAfterHours: 16, escalateTo: 'ops-supervisor@cbabank.ng', active: true },
  { id: 'esc-002', type: 'LOAN_APPROVAL', escalateAfterHours: 8, notifyAfterHours: 4, escalateTo: 'credit-head@cbabank.ng', active: true },
  { id: 'esc-003', type: 'WRITE_OFF', escalateAfterHours: 12, notifyAfterHours: 6, escalateTo: 'cro@cbabank.ng', active: true },
  { id: 'esc-004', type: 'KYC_OVERRIDE', escalateAfterHours: 6, notifyAfterHours: 3, escalateTo: 'compliance@cbabank.ng', active: true },
  { id: 'esc-005', type: 'PARAMETER_CHANGE', escalateAfterHours: 4, notifyAfterHours: 2, escalateTo: 'md-office@cbabank.ng', active: false },
];

let _approvals = [...MOCK_APPROVALS];
let _delegations = [...MOCK_DELEGATIONS];
let _escalationRules = [...MOCK_ESCALATION_RULES];

function delay(ms = 300): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const MY_ASSIGNEE = 'Ngozi Adeyemi';

export async function getMyQueue(): Promise<ApprovalRequest[]> {
  await delay(300);
  return _approvals.filter(
    (a) => a.assignedTo === MY_ASSIGNEE && (a.status === 'PENDING' || a.status === 'ESCALATED'),
  );
}

export async function getTeamQueue(): Promise<ApprovalRequest[]> {
  await delay(300);
  return _approvals.filter(
    (a) => a.status === 'PENDING' || a.status === 'ESCALATED' || a.status === 'RETURNED',
  );
}

export async function getDelegatedQueue(): Promise<ApprovalRequest[]> {
  await delay(300);
  return _approvals.filter((a) => a.status === 'DELEGATED');
}

export async function getApprovalHistory(params?: {
  type?: ApprovalType;
  status?: ApprovalStatus;
  from?: string;
  to?: string;
}): Promise<ApprovalRequest[]> {
  await delay(400);
  let results = _approvals.filter((a) =>
    a.status === 'APPROVED' || a.status === 'REJECTED' || a.status === 'RETURNED',
  );
  if (params?.type) results = results.filter((a) => a.type === params.type);
  if (params?.status) results = results.filter((a) => a.status === params.status);
  return results;
}

export async function getApprovalById(id: string): Promise<ApprovalRequest | null> {
  await delay(200);
  return _approvals.find((a) => a.id === id) ?? null;
}

export async function approveRequest(id: string, comments?: string): Promise<ApprovalRequest> {
  await delay(500);
  const item = _approvals.find((a) => a.id === id);
  if (!item) throw new Error('Approval not found');
  item.status = 'APPROVED';
  const comment: ApprovalComment = {
    id: `c-${Date.now()}`,
    by: MY_ASSIGNEE,
    role: 'Branch Credit Manager',
    text: comments ?? 'Approved.',
    action: 'APPROVE',
    timestamp: new Date().toISOString(),
  };
  item.comments = [...(item.comments ?? []), comment];
  if (item.approvalChain) {
    const step = item.approvalChain.find((s) => s.status === 'PENDING');
    if (step) {
      step.status = 'APPROVED';
      step.timestamp = new Date().toISOString();
      step.comments = comments;
    }
  }
  return { ...item };
}

export async function rejectRequest(id: string, reason: string): Promise<ApprovalRequest> {
  await delay(500);
  const item = _approvals.find((a) => a.id === id);
  if (!item) throw new Error('Approval not found');
  item.status = 'REJECTED';
  const comment: ApprovalComment = {
    id: `c-${Date.now()}`,
    by: MY_ASSIGNEE,
    role: 'Branch Credit Manager',
    text: reason,
    action: 'REJECT',
    timestamp: new Date().toISOString(),
  };
  item.comments = [...(item.comments ?? []), comment];
  if (item.approvalChain) {
    const step = item.approvalChain.find((s) => s.status === 'PENDING');
    if (step) {
      step.status = 'REJECTED';
      step.timestamp = new Date().toISOString();
      step.comments = reason;
    }
  }
  return { ...item };
}

export async function returnForAmendment(id: string, comments: string): Promise<ApprovalRequest> {
  await delay(500);
  const item = _approvals.find((a) => a.id === id);
  if (!item) throw new Error('Approval not found');
  item.status = 'RETURNED';
  const comment: ApprovalComment = {
    id: `c-${Date.now()}`,
    by: MY_ASSIGNEE,
    role: 'Branch Credit Manager',
    text: comments,
    action: 'RETURN',
    timestamp: new Date().toISOString(),
  };
  item.comments = [...(item.comments ?? []), comment];
  return { ...item };
}

export async function delegateRequest(id: string, delegateTo: string, reason: string): Promise<ApprovalRequest> {
  await delay(500);
  const item = _approvals.find((a) => a.id === id);
  if (!item) throw new Error('Approval not found');
  item.status = 'DELEGATED';
  item.assignedTo = delegateTo;
  const comment: ApprovalComment = {
    id: `c-${Date.now()}`,
    by: MY_ASSIGNEE,
    role: 'Branch Credit Manager',
    text: `Delegated to ${delegateTo}. Reason: ${reason}`,
    action: 'DELEGATE',
    timestamp: new Date().toISOString(),
  };
  item.comments = [...(item.comments ?? []), comment];
  return { ...item };
}

export async function bulkApprove(ids: string[], comments?: string): Promise<ApprovalRequest[]> {
  await delay(800);
  const results: ApprovalRequest[] = [];
  for (const id of ids) {
    const result = await approveRequest(id, comments ?? 'Bulk approved.');
    results.push(result);
  }
  return results;
}

export async function getDelegations(): Promise<Delegation[]> {
  await delay(300);
  return [..._delegations];
}

export async function createDelegation(data: Omit<Delegation, 'id' | 'active' | 'createdAt'>): Promise<Delegation> {
  await delay(500);
  const newDelegation: Delegation = {
    ...data,
    id: `del-${Date.now()}`,
    active: true,
    createdAt: new Date().toISOString(),
  };
  _delegations = [newDelegation, ..._delegations];
  return { ...newDelegation };
}

export async function cancelDelegation(id: string): Promise<void> {
  await delay(400);
  const d = _delegations.find((d) => d.id === id);
  if (d) d.active = false;
}

export async function getEscalationRules(): Promise<EscalationRule[]> {
  await delay(200);
  return [..._escalationRules];
}

export async function updateEscalationRule(id: string, data: Partial<EscalationRule>): Promise<EscalationRule> {
  await delay(400);
  const rule = _escalationRules.find((r) => r.id === id);
  if (!rule) throw new Error('Rule not found');
  Object.assign(rule, data);
  return { ...rule };
}

export async function getStats(): Promise<{
  myPending: number;
  teamPending: number;
  slaBreached: number;
  approvedToday: number;
  rejectedToday: number;
}> {
  await delay(200);
  const nowTs = now.getTime();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const myPending = _approvals.filter(
    (a) => a.assignedTo === MY_ASSIGNEE && (a.status === 'PENDING' || a.status === 'ESCALATED'),
  ).length;

  const teamPending = _approvals.filter(
    (a) => a.status === 'PENDING' || a.status === 'ESCALATED',
  ).length;

  const slaBreached = _approvals.filter((a) => {
    if (a.status !== 'PENDING' && a.status !== 'ESCALATED') return false;
    return new Date(a.slaDeadline).getTime() < nowTs;
  }).length;

  const approvedToday = _approvals.filter((a) => {
    if (a.status !== 'APPROVED') return false;
    const lastComment = a.comments?.filter((c) => c.action === 'APPROVE').pop();
    if (!lastComment) return false;
    return new Date(lastComment.timestamp).getTime() >= todayStart.getTime();
  }).length;

  const rejectedToday = _approvals.filter((a) => {
    if (a.status !== 'REJECTED') return false;
    const lastComment = a.comments?.filter((c) => c.action === 'REJECT').pop();
    if (!lastComment) return false;
    return new Date(lastComment.timestamp).getTime() >= todayStart.getTime();
  }).length;

  return { myPending, teamPending, slaBreached, approvedToday, rejectedToday };
}
