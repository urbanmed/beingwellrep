-- Reset report for testing enhanced lab extraction patterns with corrected regex patterns for "mg/d L" format
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
WHERE id = '2b3ce62b-7b97-474c-83cc-33c2d64089f1';