-- Health Buddy Phase 1: Medical Document Management System
-- Drop existing non-medical tables that don't fit the medical system
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;
DROP TABLE IF EXISTS public.health_metrics CASCADE;
DROP TABLE IF EXISTS public.progress_logs CASCADE;

-- Recreate profiles table with medical fields and encryption
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  phone_number TEXT,
  address TEXT,
  
  -- Encrypted sensitive medical information
  insurance_provider TEXT, -- Will be encrypted at application level
  insurance_policy_number TEXT, -- Will be encrypted at application level
  emergency_contact_name TEXT, -- Will be encrypted at application level
  emergency_contact_phone TEXT, -- Will be encrypted at application level
  emergency_contact_relationship TEXT, -- Will be encrypted at application level
  physician_name TEXT, -- Will be encrypted at application level
  physician_phone TEXT, -- Will be encrypted at application level
  physician_address TEXT, -- Will be encrypted at application level
  
  -- Medical preferences and settings
  preferred_language TEXT DEFAULT 'english',
  accessibility_needs TEXT[],
  notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}'::jsonb,
  privacy_settings JSONB DEFAULT '{"share_with_physician": true, "share_analytics": false}'::jsonb,
  
  -- Profile image
  avatar_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reports table for medical documents
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('lab_result', 'imaging', 'consultation', 'prescription', 'vaccination', 'procedure', 'other')),
  report_date DATE NOT NULL,
  physician_name TEXT,
  facility_name TEXT,
  description TEXT,
  
  -- File storage
  file_url TEXT, -- URL to stored document in Supabase Storage
  file_name TEXT,
  file_size INTEGER, -- Size in bytes
  file_type TEXT, -- MIME type
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  is_critical BOOLEAN DEFAULT false,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create summaries table for AI-generated medical summaries
CREATE TABLE public.summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary_type TEXT NOT NULL CHECK (summary_type IN ('health_overview', 'condition_summary', 'medication_summary', 'test_results_summary', 'timeline_summary')),
  content TEXT NOT NULL, -- AI-generated summary content
  
  -- Source reports this summary is based on
  source_report_ids UUID[] DEFAULT '{}',
  
  -- AI processing metadata
  ai_model_used TEXT,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- User interaction
  user_feedback TEXT,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  is_pinned BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analytics table for usage tracking and insights
CREATE TABLE public.analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('document_upload', 'document_view', 'summary_generated', 'summary_viewed', 'search_performed', 'export_data', 'share_report')),
  event_data JSONB DEFAULT '{}'::jsonb, -- Flexible data storage for event-specific information
  
  -- Analytics metadata
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  page_url TEXT,
  
  -- Performance metrics
  processing_time_ms INTEGER, -- For AI operations
  file_processing_size INTEGER, -- For document uploads
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for reports table
CREATE POLICY "Users can view their own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports"
  ON public.reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports"
  ON public.reports FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for summaries table
CREATE POLICY "Users can view their own summaries"
  ON public.summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own summaries"
  ON public.summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own summaries"
  ON public.summaries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own summaries"
  ON public.summaries FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for analytics table
CREATE POLICY "Users can view their own analytics"
  ON public.analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analytics"
  ON public.analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create updated_at triggers for tables that need them
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_summaries_updated_at
  BEFORE UPDATE ON public.summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage buckets for medical files and profile images
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('medical-documents', 'medical-documents', false),
  ('profile-images', 'profile-images', true);

-- Storage policies for medical documents (private)
CREATE POLICY "Users can view their own medical documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'medical-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own medical documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'medical-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own medical documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'medical-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own medical documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'medical-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for profile images (public read, user write)
CREATE POLICY "Profile images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

CREATE POLICY "Users can upload their own profile image"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile image"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile image"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create indexes for better performance
CREATE INDEX idx_reports_user_id ON public.reports(user_id);
CREATE INDEX idx_reports_report_type ON public.reports(report_type);
CREATE INDEX idx_reports_report_date ON public.reports(report_date);
CREATE INDEX idx_reports_tags ON public.reports USING GIN(tags);

CREATE INDEX idx_summaries_user_id ON public.summaries(user_id);
CREATE INDEX idx_summaries_summary_type ON public.summaries(summary_type);
CREATE INDEX idx_summaries_source_report_ids ON public.summaries USING GIN(source_report_ids);

CREATE INDEX idx_analytics_user_id ON public.analytics(user_id);
CREATE INDEX idx_analytics_event_type ON public.analytics(event_type);
CREATE INDEX idx_analytics_created_at ON public.analytics(created_at);