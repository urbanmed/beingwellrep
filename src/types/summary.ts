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

export interface SummaryContent {
  summary?: string;
  abnormal_findings?: Array<{
    finding: string;
    explanation: string;
    significance: string;
    urgency: 'low' | 'moderate' | 'high';
  }> | string[];
  normal_findings?: string[];
  recommended_actions?: string[];
  doctor_questions?: string[];
  severity_level?: 'low' | 'moderate' | 'high';
  overall_concern_level?: 'low' | 'moderate' | 'high';
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
}