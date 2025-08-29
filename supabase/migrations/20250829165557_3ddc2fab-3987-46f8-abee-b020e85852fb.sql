-- Reset report for fresh processing to test enhanced lab extraction
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
WHERE id = '388e507b-9b40-4e49-87f3-7fde56256f51';