-- Reset report for testing enhanced lab extraction patterns with improved regex for "mg/d L" format
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
WHERE id = 'b8ab3659-b495-4bd8-9894-2a97cebb156e';