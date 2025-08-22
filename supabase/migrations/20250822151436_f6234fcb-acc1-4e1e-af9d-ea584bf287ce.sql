-- Reset failed documents to allow reprocessing
-- This will clean up the two failed documents and allow them to be reprocessed
UPDATE reports 
SET 
  parsing_status = 'pending',
  processing_phase = 'pending',
  progress_percentage = 0,
  processing_error = null,
  processing_lock = null,
  processing_started_at = null,
  lock_expires_at = null,
  retry_count = 0
WHERE id IN (
  'eb4d7253-c423-430d-ad88-d1e899f2b698',
  'fd86959e-a768-42af-bf87-50e380cfac18',
  '68fb0596-d966-4884-92a2-ce69ddd5c9d4'
) OR (parsing_status = 'failed' AND processing_error LIKE '%reports_report_type_check%');