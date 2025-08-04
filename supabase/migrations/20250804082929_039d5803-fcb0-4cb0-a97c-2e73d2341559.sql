-- Add OCR-related columns to reports table
ALTER TABLE public.reports 
ADD COLUMN ocr_status text DEFAULT 'pending',
ADD COLUMN ocr_text text,
ADD COLUMN ocr_confidence numeric,
ADD COLUMN processing_error text;

-- Add check constraint for OCR status
ALTER TABLE public.reports 
ADD CONSTRAINT ocr_status_check 
CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed'));

-- Add index for OCR status for better query performance
CREATE INDEX idx_reports_ocr_status ON public.reports(ocr_status);

-- Add index for processing efficiency
CREATE INDEX idx_reports_user_status ON public.reports(user_id, ocr_status);