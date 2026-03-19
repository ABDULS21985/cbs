import { z } from 'zod';

const signatorySchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  fullName: z.string().min(1, 'Name is required'),
  role: z.string().min(1, 'Role is required'),
});

export const accountOpeningSchema = z.object({
  // Step 1 — Customer
  customerId: z.string().min(1, 'Please select a customer'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerType: z.enum(['INDIVIDUAL', 'CORPORATE']),
  customerSegment: z.string(),
  customerKycStatus: z.enum(['VERIFIED', 'PENDING', 'REJECTED']),
  customerPhone: z.string(),
  customerEmail: z.string(),

  // Step 2 — Product
  productId: z.string().min(1, 'Please select a product'),
  productName: z.string(),
  productType: z.enum(['SAVINGS', 'CURRENT', 'DOMICILIARY']),
  currency: z.string().min(1, 'Currency is required'),

  // Step 3 — Configuration
  accountTitle: z.string().min(2, 'Account title must be at least 2 characters').max(100, 'Account title must be at most 100 characters'),
  initialDeposit: z.number().min(0, 'Initial deposit cannot be negative'),
  signatories: z.array(signatorySchema).optional(),
  signingRule: z.enum(['ANY_ONE', 'ANY_TWO', 'ALL']).optional(),
  requestDebitCard: z.boolean().default(false),
  smsAlerts: z.boolean().default(true),
  eStatement: z.boolean().default(true),

  // Step 4 — Compliance (stored result)
  complianceChecked: z.boolean().default(false),

  // Step 5 — Terms
  termsAccepted: z.boolean().refine((v) => v === true, { message: 'You must accept the terms and conditions' }),
});

export type AccountOpeningFormData = z.infer<typeof accountOpeningSchema>;
