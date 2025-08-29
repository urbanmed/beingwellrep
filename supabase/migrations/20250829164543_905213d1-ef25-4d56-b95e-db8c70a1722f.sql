-- Step 6: Test the complete fix - Trigger fresh processing
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
WHERE id = '5589e978-fa02-4d20-bdac-b8f6822d3686';