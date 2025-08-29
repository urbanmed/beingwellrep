-- Reset the report for reprocessing
UPDATE reports 
SET 
  parsing_status = 'pending',
  parsed_data = NULL,
  processing_phase = NULL,
  progress_percentage = 0,
  processing_lock = NULL,
  processing_started_at = NULL,
  lock_expires_at = NULL,
  processing_error = NULL
WHERE id = '955e12f8-b5f8-442d-af77-148de374397d';