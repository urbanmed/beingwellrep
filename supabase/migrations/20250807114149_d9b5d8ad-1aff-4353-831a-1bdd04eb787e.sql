-- Create content_library table for ContentManagement
CREATE TABLE public.content_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('template', 'guideline', 'educational')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  content TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_library ENABLE ROW LEVEL SECURITY;

-- Create policies for content_library
CREATE POLICY "Moderators can view all content" 
ON public.content_library 
FOR SELECT 
USING (has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Moderators can create content" 
ON public.content_library 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Moderators can update content" 
ON public.content_library 
FOR UPDATE 
USING (has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can delete content" 
ON public.content_library 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Create system_metrics table for SystemHealth
CREATE TABLE public.system_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('database', 'api', 'cpu', 'memory', 'storage', 'network')),
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'warning', 'critical', 'offline')),
  details JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for system_metrics
CREATE POLICY "Admins can view system metrics" 
ON public.system_metrics 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can insert metrics" 
ON public.system_metrics 
FOR INSERT 
WITH CHECK (true); -- Allow system to insert metrics

-- Create admin_settings table for Settings
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category, setting_key)
);

-- Enable RLS
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_settings
CREATE POLICY "Admins can view settings" 
ON public.admin_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can update settings" 
ON public.admin_settings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can insert settings" 
ON public.admin_settings 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_content_library_updated_at
BEFORE UPDATE ON public.content_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial system metrics
INSERT INTO public.system_metrics (metric_type, metric_name, value, unit, status, details) VALUES
('database', 'Connection Pool', 85, 'percent', 'healthy', '{"max_connections": 100, "active_connections": 85}'),
('api', 'Response Time', 120, 'ms', 'healthy', '{"endpoint": "average", "last_check": "2024-01-07T10:00:00Z"}'),
('cpu', 'CPU Usage', 45, 'percent', 'healthy', '{"cores": 4, "load_average": 1.2}'),
('memory', 'Memory Usage', 68, 'percent', 'healthy', '{"total_mb": 8192, "used_mb": 5570}'),
('storage', 'Disk Usage', 72, 'percent', 'healthy', '{"total_gb": 100, "used_gb": 72}'),
('network', 'Network I/O', 1.5, 'mbps', 'healthy', '{"ingress": 0.8, "egress": 0.7}');

-- Insert some initial admin settings
INSERT INTO public.admin_settings (category, setting_key, setting_value, description, updated_by) VALUES
('general', 'site_name', '"HealthVault Admin"', 'Main site name displayed in admin interface', '00000000-0000-0000-0000-000000000000'),
('general', 'maintenance_mode', 'false', 'Enable/disable maintenance mode', '00000000-0000-0000-0000-000000000000'),
('security', 'session_timeout', '3600', 'Session timeout in seconds', '00000000-0000-0000-0000-000000000000'),
('notifications', 'email_notifications', 'true', 'Enable email notifications', '00000000-0000-0000-0000-000000000000'),
('notifications', 'sms_notifications', 'true', 'Enable SMS notifications', '00000000-0000-0000-0000-000000000000'),
('ai', 'max_processing_time', '300', 'Maximum AI processing time in seconds', '00000000-0000-0000-0000-000000000000'),
('storage', 'max_file_size', '50', 'Maximum file size in MB', '00000000-0000-0000-0000-000000000000');

-- Insert some sample content library items
INSERT INTO public.content_library (title, type, status, content, description, tags, created_by) VALUES
('Patient Data Privacy Template', 'template', 'published', 'This template outlines the privacy policy for patient data handling...', 'Standard template for patient data privacy policies', '{"privacy", "template", "HIPAA"}', '00000000-0000-0000-0000-000000000000'),
('Medical Report Guidelines', 'guideline', 'published', 'Guidelines for proper medical report formatting and submission...', 'Comprehensive guidelines for medical professionals', '{"guidelines", "medical", "reports"}', '00000000-0000-0000-0000-000000000000'),
('AI Processing Educational Material', 'educational', 'published', 'Learn how our AI processes your medical documents...', 'Educational content about AI medical document processing', '{"education", "AI", "processing"}', '00000000-0000-0000-0000-000000000000'),
('Emergency Contact Protocol', 'template', 'draft', 'Template for emergency contact procedures...', 'Draft template for emergency situations', '{"emergency", "template", "protocol"}', '00000000-0000-0000-0000-000000000000');