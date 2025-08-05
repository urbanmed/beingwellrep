-- Update reports table schema for LLM-based document parsing
-- Add new columns for structured data parsing
ALTER TABLE public.reports 
ADD COLUMN parsed_data JSONB,
ADD COLUMN parsing_model TEXT,
ADD COLUMN parsing_confidence NUMERIC;

-- Rename ocr_status to parsing_status for broader document processing
ALTER TABLE public.reports 
RENAME COLUMN ocr_status TO parsing_status;

-- Rename ocr_text to extracted_text for clarity
ALTER TABLE public.reports 
RENAME COLUMN ocr_text TO extracted_text;

-- Rename ocr_confidence to extraction_confidence
ALTER TABLE public.reports 
RENAME COLUMN ocr_confidence TO extraction_confidence;

-- Update default value for parsing_status
ALTER TABLE public.reports 
ALTER COLUMN parsing_status SET DEFAULT 'pending';

-- Create index on parsed_data for efficient JSON queries
CREATE INDEX idx_reports_parsed_data ON public.reports USING GIN(parsed_data);

-- Create index on parsing_status for filtering
CREATE INDEX idx_reports_parsing_status ON public.reports(parsing_status);