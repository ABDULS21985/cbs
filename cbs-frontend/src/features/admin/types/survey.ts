// Auto-generated from backend entities

export interface CustomerSurvey {
  id: number;
  surveyCode: string;
  surveyName: string;
  surveyType: string;
  description: string;
  targetSegment: string;
  deliveryChannel: string;
  questions: Record<string, unknown>[];
  startDate: string;
  endDate: string;
  totalSent: number;
  totalResponses: number;
  responseRatePct: number;
  avgScore: number;
  npsScore: number;
  scoreDistribution: Record<string, unknown>;
  keyThemes: string[];
  actionItems: Record<string, unknown>[];
  status: string;
}

export interface SurveyResponse {
  id: number;
  responseRef: string;
  surveyId: number;
  customerId: number;
  channel: string;
  answers: Record<string, unknown>[];
  overallScore: number;
  npsCategory: string;
  sentiment: string;
  verbatimFeedback: string;
  completedAt?: string;
  createdAt: string;
}

