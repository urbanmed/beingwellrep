-- Drop the existing check constraint for summary_type
ALTER TABLE public.summaries DROP CONSTRAINT IF EXISTS summaries_summary_type_check;

-- Add a new check constraint that matches the application's summary types
ALTER TABLE public.summaries ADD CONSTRAINT summaries_summary_type_check 
CHECK (summary_type IN ('comprehensive', 'abnormal_findings', 'trend_analysis', 'doctor_prep'));