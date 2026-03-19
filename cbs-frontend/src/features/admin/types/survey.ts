// Auto-generated from backend entities

export interface CustomerSurvey {
  id: number;
  surveyCode: string;
  surveyName: string;
  surveyType: string;
  description: string;
  targetSegment: string;
  deliveryChannel: string;
  questions: Map<String, Object[];
  startDate: string;
  endDate: string;
  totalSent: number;
  totalResponses: number;
  responseRatePct: number;
  avgScore: number;
  npsScore: number;
  scoreDistribution: Record<string, unknown>;
  keyThemes: string[];
  actionItems: Map<String, Object[];
  status: string;
}

export interface SurveyResponse {
  id: number;
  responseRef: string;
  surveyId: number;
  customerId: number;
  channel: string;
  answers: Map<String, Object[];
  overallScore: number;
  npsCategory: string;
  sentiment: string;
  verbatimFeedback: string;
  completedAt?: string;
  createdAt: string;
}

