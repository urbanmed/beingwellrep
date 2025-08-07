-- Update the reports table check constraint to include 'custom' as a valid report_type
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_report_type_check;

-- Add the updated constraint with 'custom' included
ALTER TABLE public.reports ADD CONSTRAINT reports_report_type_check 
CHECK (report_type IN ('lab_results', 'prescription', 'radiology', 'vitals', 'discharge_summary', 'consultation', 'general', 'custom'));