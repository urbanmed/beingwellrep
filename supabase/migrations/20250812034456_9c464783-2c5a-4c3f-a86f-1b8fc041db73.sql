-- Drop legacy OCR index
DROP INDEX IF EXISTS idx_reports_ocr_status;

-- Create properly named parsing status index
CREATE INDEX IF NOT EXISTS idx_reports_parsing_status ON reports(parsing_status);

-- Add comment to document the transition
COMMENT ON COLUMN reports.parsing_status IS 'Document processing status using LLM-based parsing (GPT-4o-mini vision + unpdf)';