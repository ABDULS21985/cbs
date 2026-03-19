// Auto-generated from backend entities

export interface GuidedFlow {
  id: number;
  flowCode: string;
  flowName: string;
  flowType: string;
  description: string;
  steps: Record<string, unknown>;
  decisionTree: Record<string, unknown>;
  estimatedDurationMin: number;
  completionRatePct: number;
  totalStarts: number;
  totalCompletions: number;
  targetChannel: string;
  status: string;
}

export interface HelpArticle {
  id: number;
  articleCode: string;
  title: string;
  articleType: string;
  category: string;
  content: string;
  summary: string;
  tags: Record<string, unknown>;
  productFamily: string;
  language: string;
  viewCount: number;
  helpfulnessYes: number;
  helpfulnessNo: number;
  relatedArticles: Record<string, unknown>;
  status: string;
  publishedAt: string;
}

