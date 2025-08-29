-- Reset the report for reprocessing and clear duplicate FHIR data
UPDATE public.reports 
SET 
  parsing_status = 'pending',
  parsed_data = NULL,
  processing_phase = NULL,
  progress_percentage = 0,
  processing_lock = NULL,
  processing_started_at = NULL,
  lock_expires_at = NULL,
  error_category = NULL,
  updated_at = now()
WHERE id = '5859c3bf-57aa-465d-85c1-e8722a886c8f';

-- Clear existing FHIR data for this specific report to prevent duplicates
DELETE FROM public.fhir_observations 
WHERE source_report_id = '5859c3bf-57aa-465d-85c1-e8722a886c8f';

DELETE FROM public.fhir_medication_requests 
WHERE source_report_id = '5859c3bf-57aa-465d-85c1-e8722a886c8f';

DELETE FROM public.fhir_diagnostic_reports 
WHERE source_report_id = '5859c3bf-57aa-465d-85c1-e8722a886c8f';