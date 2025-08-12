-- Create import_jobs table for tracking import operations
CREATE TABLE public.import_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  validation_results JSONB DEFAULT '{}',
  imported_record_count INTEGER DEFAULT 0,
  error_log JSONB DEFAULT '[]',
  file_url TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create import_templates table for downloadable templates
CREATE TABLE public.import_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  file_type TEXT NOT NULL,
  template_data JSONB NOT NULL DEFAULT '{}',
  schema_definition JSONB NOT NULL DEFAULT '{}',
  example_data JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on import_jobs
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on import_templates
ALTER TABLE public.import_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for import_jobs
CREATE POLICY "Users can view their own import jobs" 
ON public.import_jobs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own import jobs" 
ON public.import_jobs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own import jobs" 
ON public.import_jobs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policies for import_templates
CREATE POLICY "Users can view active templates" 
ON public.import_templates 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage templates" 
ON public.import_templates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Create trigger for timestamps
CREATE TRIGGER update_import_jobs_updated_at
BEFORE UPDATE ON public.import_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_import_templates_updated_at
BEFORE UPDATE ON public.import_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.import_templates (name, description, file_type, template_data, schema_definition, example_data) VALUES
('Medical Records CSV', 'Template for importing medical records from CSV files', 'csv', 
 '{"headers": ["report_date", "title", "physician_name", "facility_name", "report_type", "description", "tags"]}',
 '{"required_fields": ["report_date", "title"], "field_types": {"report_date": "date", "title": "string", "physician_name": "string", "facility_name": "string", "report_type": "string", "description": "text", "tags": "array"}}',
 '{"sample_rows": [{"report_date": "2024-01-15", "title": "Annual Physical", "physician_name": "Dr. Smith", "facility_name": "City Medical Center", "report_type": "general", "description": "Routine annual physical examination", "tags": "annual,physical,routine"}]}'),

('Health Data JSON', 'Template for importing structured health data in JSON format', 'json',
 '{"structure": {"reports": [{"report_date": "", "title": "", "data": {}}]}}',
 '{"required_fields": ["reports"], "field_types": {"reports": "array", "report_date": "date", "title": "string", "data": "object"}}',
 '{"reports": [{"report_date": "2024-01-15", "title": "Blood Test Results", "data": {"cholesterol": "180", "glucose": "95", "blood_pressure": "120/80"}}]}'),

('Lab Results CSV', 'Template for importing laboratory test results', 'csv',
 '{"headers": ["test_date", "test_name", "result_value", "reference_range", "units", "status", "physician_name", "lab_name"]}',
 '{"required_fields": ["test_date", "test_name", "result_value"], "field_types": {"test_date": "date", "test_name": "string", "result_value": "string", "reference_range": "string", "units": "string", "status": "string", "physician_name": "string", "lab_name": "string"}}',
 '{"sample_rows": [{"test_date": "2024-01-10", "test_name": "Total Cholesterol", "result_value": "180", "reference_range": "<200", "units": "mg/dL", "status": "Normal", "physician_name": "Dr. Johnson", "lab_name": "LabCorp"}]}');