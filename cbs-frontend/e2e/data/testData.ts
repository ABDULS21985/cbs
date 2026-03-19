export const CUSTOMER_DATA = {
  individual: {
    type: 'INDIVIDUAL' as const,
    title: 'Mr',
    firstName: 'James',
    lastName: 'Okonkwo',
    dateOfBirth: '1985-06-15',
    gender: 'MALE',
    nationality: 'Nigerian',
    nin: '12345678901',
    bvn: '22345678901',
    email: 'james.okonkwo@test.cba',
    phoneNumber: '08012345678',
    address: {
      street: '45 Marina Street',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      postalCode: '101001',
    },
    employment: {
      status: 'EMPLOYED',
      employer: 'Tech Corp Ltd',
      position: 'Software Engineer',
      monthlyIncome: 500000,
    },
    nextOfKin: {
      name: 'Ngozi Okonkwo',
      relationship: 'SPOUSE',
      phoneNumber: '08087654321',
    },
  },
  corporate: {
    type: 'CORPORATE' as const,
    companyName: 'TechCorp Nigeria Ltd',
    rcNumber: 'RC1234567',
    taxId: 'TIN12345678',
    industry: 'Technology',
    email: 'info@techcorp.test.cba',
    phoneNumber: '0112345678',
    incorporationDate: '2015-03-20',
    address: {
      street: '10 Victoria Island',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
    },
  },
};

export const LOAN_DATA = {
  personal: {
    productCode: 'PL001',
    productName: 'Personal Loan',
    requestedAmount: 500000,
    tenorMonths: 12,
    purpose: 'Medical expenses',
    repaymentMethod: 'EQUAL_INSTALLMENT',
    repaymentFrequency: 'MONTHLY',
    monthlyIncome: 300000,
    monthlyExpenses: 80000,
  },
  sme: {
    productCode: 'SME001',
    productName: 'SME Working Capital',
    requestedAmount: 5000000,
    tenorMonths: 24,
    purpose: 'Working capital',
    repaymentMethod: 'REDUCING_BALANCE',
    repaymentFrequency: 'MONTHLY',
    monthlyIncome: 2000000,
    monthlyExpenses: 800000,
  },
};

export const PAYMENT_DATA = {
  internalTransfer: {
    amount: 50000,
    narration: 'Test internal transfer',
    channel: 'CBS',
  },
  nibsTransfer: {
    amount: 25000,
    narration: 'Test NIBSS transfer',
    bankCode: '058',
    destinationAccount: '0123456789',
  },
};

export const FIXED_DEPOSIT_DATA = {
  standard: {
    amount: 1000000,
    tenorDays: 90,
    interestRate: 12.5,
    rolloverInstruction: 'ROLL_PRINCIPAL_AND_INTEREST',
  },
};

export const SEED_CUSTOMER_NUMBER = process.env.SEED_CUSTOMER_NUMBER || 'CUS-TEST-001';
export const SEED_ACCOUNT_NUMBER = process.env.SEED_ACCOUNT_NUMBER || '1000000001';
export const SEED_LOAN_NUMBER = process.env.SEED_LOAN_NUMBER || 'LN-TEST-001';
