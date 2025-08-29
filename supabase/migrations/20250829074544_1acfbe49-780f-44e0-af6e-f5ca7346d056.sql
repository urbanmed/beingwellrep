-- Clear existing FHIR duplicates for the current report
DELETE FROM fhir_observations WHERE source_report_id = 'd74c239f-6a28-4fa4-9cf4-8a3c9cdede33';
DELETE FROM fhir_diagnostic_reports WHERE source_report_id = 'd74c239f-6a28-4fa4-9cf4-8a3c9cdede33';

-- Reset the report to trigger fresh processing with proper data extraction
UPDATE reports SET 
  parsing_status = 'pending',
  parsed_data = NULL,
  processing_phase = NULL,
  progress_percentage = 0,
  processing_lock = NULL,
  processing_started_at = NULL,
  lock_expires_at = NULL,
  updated_at = now()
WHERE id = 'd74c239f-6a28-4fa4-9cf4-8a3c9cdede33';