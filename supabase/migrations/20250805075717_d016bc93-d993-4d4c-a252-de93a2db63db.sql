-- Update the check constraint for reports.report_type to match the frontend values
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_report_type_check;

-- Add the updated constraint with the correct values from ReportTypeSelector
ALTER TABLE public.reports ADD CONSTRAINT reports_report_type_check 
CHECK (report_type IN (
  'lab_results',
  'radiology', 
  'procedure',
  'pathology',
  'consultation',
  'prescription',
  'vaccination',
  'discharge',
  'allergy',
  'mental_health',
  'general'
));