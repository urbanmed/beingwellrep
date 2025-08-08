export interface Summary {
  id: string;
  user_id: string;
  title: string;
  summary_type: 'comprehensive' | 'abnormal_findings' | 'trend_analysis' | 'doctor_prep';
  content: string | any; // Can be JSON string or parsed object
  source_report_ids: string[];
  generated_at: string;
  ai_model_used?: string;
  confidence_score?: number;
  is_pinned?: boolean;
  user_rating?: number;
  user_feedback?: string;
  created_at: string;
  updated_at: string;
}

export type RiskLevel = 'low' | 'moderate' | 'high';

export type RiskCategory =
  | 'cardiovascular'
  | 'renal'
  | 'metabolic'
  | 'hematology'
  | 'endocrine'
  | 'pulmonary'
  | 'neurology'
  | 'gastroenterology'
  | 'infectious'
  | 'musculoskeletal'
  | 'oncology'
  | 'other';

export interface RiskCategoryScore {
  category: RiskCategory;
  score: number; // 1-100
  level: RiskLevel;
}

export interface FindingItem {
  // Support both legacy and new shapes
  finding?: string; // legacy
  text?: string; // new
  explanation?: string;
  significance?: string;
  urgency?: RiskLevel;
  risk_score?: number; // 1-100
  category?: RiskCategory;
}

export interface SummaryContent {
  summary?: string;
  abnormal_findings?: Array<FindingItem> | string[];
  normal_findings?: string[];
  recommended_actions?: string[];
  doctor_questions?: string[];
  severity_level?: RiskLevel;
  overall_concern_level?: RiskLevel;
  confidence_score?: number;
  trends?: Array<{
    parameter: string;
    trend: 'improving' | 'stable' | 'worsening';
    details: string;
  }>;
  overall_health_trajectory?: 'improving' | 'stable' | 'declining';
  key_insights?: string[];
  key_topics?: string[];
  specific_questions?: string[];
  symptoms_to_mention?: string[];
  preparation_tips?: string[];
  immediate_action_needed?: boolean;
  // New Risk scoring block
  risk?: {
    overall_score?: number; // 1-100
    level?: RiskLevel;
    category_breakdown?: RiskCategoryScore[];
  };
  // Priority blocks (generic)
  high_priority?: any;
  medium_priority?: any;
  low_priority?: any;
}
