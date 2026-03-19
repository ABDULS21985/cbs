// Auto-generated from backend entities

export interface StaffWorkbenchSession {
  id: number;
  sessionId: string;
  staffUserId: string;
  staffName: string;
  workbenchType: string;
  customerId: number;
  activeContext: Record<string, unknown>;
  sessionStatus: string;
  startedAt: string;
  lastActivityAt: string;
  endedAt: string;
}

