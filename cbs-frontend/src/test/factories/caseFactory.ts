let seq = 0;

export function createMockCase(overrides: Record<string, unknown> = {}) {
  seq++;
  return {
    id: overrides.id ?? seq,
    caseNumber: overrides.caseNumber ?? `CASE-${String(seq).padStart(6, '0')}`,
    customerId: overrides.customerId ?? 1,
    customerName: overrides.customerName ?? `Customer ${seq}`,
    caseType: overrides.caseType ?? 'COMPLAINT',
    caseCategory: overrides.caseCategory ?? 'GENERAL',
    subCategory: overrides.subCategory ?? 'Service Quality',
    priority: overrides.priority ?? 'MEDIUM',
    status: overrides.status ?? 'OPEN',
    subject: overrides.subject ?? `Test Case ${seq}`,
    description: overrides.description ?? 'Test case description',
    assignedTo: overrides.assignedTo ?? 'agent-1',
    assignedToName: overrides.assignedToName ?? 'Agent One',
    assignedTeam: overrides.assignedTeam ?? 'Support Team',
    escalatedTo: overrides.escalatedTo ?? undefined,
    rootCause: overrides.rootCause ?? undefined,
    resolution: overrides.resolution ?? undefined,
    compensationAmount: overrides.compensationAmount ?? undefined,
    compensationApproved: overrides.compensationApproved ?? undefined,
    compensationApprovedBy: overrides.compensationApprovedBy ?? undefined,
    compensationApprovedAt: overrides.compensationApprovedAt ?? undefined,
    compensationRejectionReason: overrides.compensationRejectionReason ?? undefined,
    slaDueAt: overrides.slaDueAt ?? new Date(Date.now() + 24 * 3600000).toISOString(),
    slaBreached: overrides.slaBreached ?? false,
    channelOriginated: overrides.channelOriginated ?? 'branch',
    linkedCaseId: overrides.linkedCaseId ?? undefined,
    linkedTransactionId: overrides.linkedTransactionId ?? undefined,
    resolutionType: overrides.resolutionType ?? undefined,
    relatedCaseIds: overrides.relatedCaseIds ?? [],
    attachments: overrides.attachments ?? [],
    activities: overrides.activities ?? [],
    openedAt: overrides.openedAt ?? '2026-03-18T10:00:00Z',
    resolvedAt: overrides.resolvedAt ?? undefined,
    closedAt: overrides.closedAt ?? undefined,
    createdAt: overrides.createdAt ?? '2026-03-18T10:00:00Z',
    updatedAt: overrides.updatedAt ?? '2026-03-18T10:00:00Z',
    ...overrides,
  };
}

export function createMockCaseStats(overrides: Record<string, unknown> = {}) {
  return {
    openCases: 156,
    slaBreached: 23,
    resolvedToday: 45,
    avgResolutionHours: 4.2,
    ...overrides,
  };
}

export function createMockCaseNote(overrides: Record<string, unknown> = {}) {
  seq++;
  return {
    id: overrides.id ?? seq,
    type: 'NOTE',
    noteType: overrides.noteType ?? 'INTERNAL',
    content: overrides.content ?? 'Test note content',
    createdBy: overrides.createdBy ?? 'agent-1',
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    ...overrides,
  };
}

export function createMockCaseAttachment(overrides: Record<string, unknown> = {}) {
  seq++;
  return {
    id: overrides.id ?? seq,
    filename: overrides.filename ?? `document-${seq}.pdf`,
    fileSize: overrides.fileSize ?? 1024 * 50,
    mimeType: overrides.mimeType ?? 'application/pdf',
    uploadedBy: overrides.uploadedBy ?? 'agent-1',
    uploadedAt: overrides.uploadedAt ?? new Date().toISOString(),
    url: overrides.url ?? `/api/v1/cases/CASE-000001/attachments/${seq}/download`,
    ...overrides,
  };
}

export function createMockRca(overrides: Record<string, unknown> = {}) {
  seq++;
  return {
    id: overrides.id ?? seq,
    rcaCode: overrides.rcaCode ?? `RCA-${String(seq).padStart(6, '0')}`,
    caseId: overrides.caseId ?? 1,
    analysisMethod: overrides.analysisMethod ?? 'FIVE_WHY',
    analysisDate: overrides.analysisDate ?? '2026-03-19',
    analystName: overrides.analystName ?? 'Jane Analyst',
    problemStatement: overrides.problemStatement ?? 'System failure causing service disruption',
    rootCauseCategory: overrides.rootCauseCategory ?? 'SYSTEM',
    rootCauseSubCategory: overrides.rootCauseSubCategory ?? 'Hardware Failure',
    rootCauseDescription: overrides.rootCauseDescription ?? 'Motor malfunction in unit',
    contributingFactors: overrides.contributingFactors ?? {},
    evidenceReferences: overrides.evidenceReferences ?? {},
    customersAffected: overrides.customersAffected ?? 15,
    financialImpact: overrides.financialImpact ?? 750000,
    reputationalImpact: overrides.reputationalImpact ?? 'HIGH',
    regulatoryImplication: overrides.regulatoryImplication ?? false,
    correctiveActions: overrides.correctiveActions ?? {},
    preventiveActions: overrides.preventiveActions ?? {},
    lessonsLearned: overrides.lessonsLearned ?? 'Schedule preventive inspections quarterly.',
    linkedKnowledgeArticleId: overrides.linkedKnowledgeArticleId ?? undefined,
    status: overrides.status ?? 'IN_PROGRESS',
    ...overrides,
  };
}

export function createMockRcaDashboard(overrides: Record<string, unknown> = {}) {
  return {
    totalAnalyses: 42,
    pendingAnalyses: 8,
    completedAnalyses: 24,
    validatedAnalyses: 10,
    byCategory: { PROCESS: 15, SYSTEM: 12, PEOPLE: 8, THIRD_PARTY: 5, POLICY: 2 },
    byStatus: { IN_PROGRESS: 8, COMPLETED: 24, VALIDATED: 10 },
    avgDaysToComplete: 5.3,
    totalCasesWithRca: 38,
    financialImpactTotal: 12500000,
    ...overrides,
  };
}

export function createMockRecurringRootCause(overrides: Record<string, unknown> = {}) {
  return {
    category: overrides.category ?? 'SYSTEM',
    subCategory: overrides.subCategory ?? 'Hardware Failure',
    occurrenceCount: overrides.occurrenceCount ?? 12,
    affectedCases: overrides.affectedCases ?? 10,
    trend: overrides.trend ?? 'INCREASING',
    firstSeen: overrides.firstSeen ?? '2026-01-15',
    lastSeen: overrides.lastSeen ?? '2026-03-18',
    avgResolutionDays: overrides.avgResolutionDays ?? 3.5,
    ...overrides,
  };
}

export function createMockPatternInsight(overrides: Record<string, unknown> = {}) {
  seq++;
  return {
    id: overrides.id ?? seq,
    patternType: overrides.patternType ?? 'RECURRING_ROOT_CAUSE',
    patternDescription: overrides.patternDescription ?? `Recurring root cause: SYSTEM (${seq} cases)`,
    caseCount: overrides.caseCount ?? 5,
    dateRangeStart: overrides.dateRangeStart ?? '2026-01-01',
    dateRangeEnd: overrides.dateRangeEnd ?? '2026-03-22',
    affectedProducts: overrides.affectedProducts ?? {},
    affectedChannels: overrides.affectedChannels ?? {},
    rootCauseCategory: overrides.rootCauseCategory ?? 'SYSTEM',
    trendDirection: overrides.trendDirection ?? 'INCREASING',
    recommendedAction: overrides.recommendedAction ?? 'Upgrade hardware fleet',
    priority: overrides.priority ?? 'HIGH',
    assignedTo: overrides.assignedTo ?? '',
    status: overrides.status ?? 'IDENTIFIED',
    ...overrides,
  };
}
