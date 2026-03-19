// Auto-generated from backend entities

export interface DialogueMessage {
  id: number;
  messageRef: string;
  sessionId: number;
  senderType: string;
  content: string;
  contentType: string;
  attachments: Record<string, unknown>;
  intentDetected: string;
  confidenceScore: number;
  suggestedActions: Record<string, unknown>;
  createdAt: string;
}

export interface DialogueSession {
  id: number;
  sessionCode: string;
  customerId: number;
  channel: string;
  language: string;
  intent: string;
  context: Record<string, unknown>;
  customerSentiment: string;
  escalatedToHuman: boolean;
  agentId: string;
  messagesCount: number;
  resolutionStatus: string;
  startedAt: string;
  endedAt: string;
  status: string;
}

