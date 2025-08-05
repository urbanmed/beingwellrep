-- Update the default value to use a valid report type
ALTER TABLE public.reports 
ALTER COLUMN report_type SET DEFAULT 'general';