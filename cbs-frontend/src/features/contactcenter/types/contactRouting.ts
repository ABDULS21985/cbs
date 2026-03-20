// Auto-generated from backend entities

export interface AgentState {
  id: number;
  agentId: string;
  agentName: string;
  centerId: number;
  skillGroups: string[];
  languages: string[];
  currentState: string;
  stateChangedAt: string;
  currentInteractionId: number;
  dailyHandled: number;
  dailyAvgHandleTime: number;
  dailyFirstContactResolution: number;
  qualityScore: number;
  maxConcurrentChats: number;
  activeChatCount: number;
  shiftStart: string;
  shiftEnd: string;
}

export interface CallbackRequest {
  id: number;
  customerId: number;
  callbackNumber: string;
  preferredTime: string;
  preferredLanguage: string;
  contactReason: string;
  urgency: string;
  assignedAgentId: string;
  attemptCount: number;
  maxAttempts: number;
  lastAttemptAt: string;
  lastOutcome: string;
  status: string;
}

export interface ContactQueue {
  id: number;
  queueName: string;
  centerId: number;
  queueType: string;
  skillRequired: string[];
  currentWaiting: number;
  longestWaitSeconds: number;
  slaTargetSeconds: number;
  slaAchievementPct: number;
  maxCapacity: number;
  overflowQueueId: number;
  priorityLevel: string;
  agentsAssigned: number;
  agentsAvailable: number;
  status: string;
}

export interface RoutingRule {
  id: number;
  ruleName: string;
  ruleType: string;
  priority: number;
  conditions: Record<string, unknown>;
  targetQueue: string;
  targetSkillGroup: string;
  targetAgentId: string;
  fallbackRuleId: number;
  maxWaitBeforeFallback: number;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string;
}
