-- Reset report for fresh processing to test enhanced lab extraction with raw text fallback
UPDATE reports 
SET 
  parsing_status = 'pending',
  parsed_data = null,
  processing_lock = NULL,
  processing_started_at = NULL,
  lock_expires_at = NULL,
  retry_count = 0,
  processing_error = NULL,
  error_category = NULL,
  progress_percentage = 0,
  processing_phase = 'pending'
WHERE id = '5af98b82-3d85-497e-8ad8-3c32a9e06fe9';