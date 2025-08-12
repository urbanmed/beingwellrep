-- Create notifications table for real-time notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, success, warning, error, health
  category TEXT NOT NULL DEFAULT 'general', -- general, health, processing, sos, reminder
  is_read BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 1, -- 1=low, 2=medium, 3=high, 4=critical
  metadata JSONB DEFAULT '{}',
  action_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" 
ON public.notifications 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create processing queue table
CREATE TABLE public.processing_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  report_id UUID NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1, -- 1=low, 2=medium, 3=high, 4=urgent
  status TEXT NOT NULL DEFAULT 'queued', -- queued, processing, completed, failed, retrying
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  error_message TEXT,
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  estimated_completion_time TIMESTAMP WITH TIME ZONE,
  processing_time_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.processing_queue ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own queue items" 
ON public.processing_queue 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own queue items" 
ON public.processing_queue 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own queue items" 
ON public.processing_queue 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create export jobs table
CREATE TABLE public.export_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  export_type TEXT NOT NULL, -- pdf_report, json_data, medical_summary, bulk_documents
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  parameters JSONB DEFAULT '{}',
  progress_percentage INTEGER DEFAULT 0,
  error_message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own export jobs" 
ON public.export_jobs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own export jobs" 
ON public.export_jobs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own export jobs" 
ON public.export_jobs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create health insights table
CREATE TABLE public.health_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  insight_type TEXT NOT NULL, -- trend, risk, recommendation, milestone
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info', -- info, warning, critical
  confidence_score NUMERIC(3,2), -- 0.00 to 1.00
  data_source_ids UUID[],
  insight_data JSONB DEFAULT '{}',
  action_items TEXT[],
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.health_insights ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own health insights" 
ON public.health_insights 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own health insights" 
ON public.health_insights 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own health insights" 
ON public.health_insights 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create notification delivery tracking table
CREATE TABLE public.notification_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL,
  user_id UUID NOT NULL,
  delivery_method TEXT NOT NULL, -- email, sms, push, in_app
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, delivered, failed, bounced
  delivery_details JSONB DEFAULT '{}',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own delivery status" 
ON public.notification_deliveries 
FOR SELECT 
USING (auth.uid() = user_id);

-- Add foreign key constraints
ALTER TABLE public.notification_deliveries 
ADD CONSTRAINT fk_notification_deliveries_notification_id 
FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_notifications_user_id_created_at ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_type_priority ON public.notifications(type, priority);
CREATE INDEX idx_processing_queue_status_priority ON public.processing_queue(status, priority DESC);
CREATE INDEX idx_processing_queue_user_id_status ON public.processing_queue(user_id, status);
CREATE INDEX idx_export_jobs_user_id_status ON public.export_jobs(user_id, status);
CREATE INDEX idx_health_insights_user_id_type ON public.health_insights(user_id, insight_type);
CREATE INDEX idx_notification_deliveries_notification_id ON public.notification_deliveries(notification_id);

-- Create trigger for updated_at
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_processing_queue_updated_at
BEFORE UPDATE ON public.processing_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_export_jobs_updated_at
BEFORE UPDATE ON public.export_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_health_insights_updated_at
BEFORE UPDATE ON public.health_insights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for all new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.processing_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.export_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.health_insights;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_deliveries;