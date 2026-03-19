// Auto-generated from backend entities

export interface SalesCollateral {
  id: number;
  collateralCode: string;
  title: string;
  collateralType: string;
  productFamily: string;
  productCode: string;
  description: string;
  fileReference: string;
  fileFormat: string;
  fileSizeKb: number;
  targetAudience: string;
  language: string;
  tags: string[];
  downloadCount: number;
  status: string;
  publishedAt: string;
  expiresAt: string;
}

export interface SalesKnowledgeArticle {
  id: number;
  articleCode: string;
  title: string;
  articleType: string;
  productFamily: string;
  productCode: string;
  content: string;
  keyPoints: string[];
  targetAudience: string;
  tags: string[];
  viewCount: number;
  helpfulnessScore: number;
  status: string;
  publishedAt: string;
}

