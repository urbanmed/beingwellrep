-- Make title and report_type nullable to allow immediate uploads
ALTER TABLE public.reports 
ALTER COLUMN title DROP NOT NULL,
ALTER COLUMN report_type DROP NOT NULL;

-- Add default values for immediate uploads
ALTER TABLE public.reports 
ALTER COLUMN title SET DEFAULT 'Processing...',
ALTER COLUMN report_type SET DEFAULT 'unknown';