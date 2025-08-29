-- Step 3: Reset document and clear any stale locks
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
  progress_percentage = 0
WHERE id = '5589e978-fa02-4d20-bdac-b8f6822d3686';

-- Clean up any expired locks globally
UPDATE reports 
SET 
  processing_lock = NULL,
  processing_started_at = NULL,
  lock_expires_at = NULL,
  processing_phase = 'failed',
  error_category = 'timeout'
WHERE 
  lock_expires_at IS NOT NULL 
  AND lock_expires_at < now()
  AND parsing_status IN ('pending', 'processing');