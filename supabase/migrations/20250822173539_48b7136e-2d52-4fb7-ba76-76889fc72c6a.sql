-- Enhanced reprocessing trigger for the specific document
-- This will reset the specific document and similar ones for reprocessing with improved logic

-- Reset the specific document that was reported as incomplete
UPDATE reports 
SET 
    parsing_status = 'pending',
    processing_phase = 'pending',
    progress_percentage = 0,
    processing_error = 'Reprocessing with enhanced comprehensive lab extraction logic',
    processing_lock = null,
    processing_started_at = null,
    lock_expires_at = null,
    retry_count = 0,
    updated_at = now()
WHERE 
    id = 'aa32b132-db34-4ef9-9ceb-c0d2dace7c5e'
    OR title ILIKE '%Thyroid_Profile_and_Biochemistry_Report_Mr_Praveen%';

-- Also reset any other completed documents that might have similar issues
-- (Large multi-page lab documents with suspiciously few extracted tests)
UPDATE reports 
SET 
    parsing_status = 'pending',
    processing_phase = 'pending',
    progress_percentage = 0,
    processing_error = 'Reprocessing with enhanced comprehensive extraction - suspected incomplete parsing',
    processing_lock = null,
    processing_started_at = null,
    lock_expires_at = null,
    retry_count = 0,
    updated_at = now()
WHERE 
    parsing_status = 'completed'
    AND report_type = 'lab_results'
    AND file_size > 1000000  -- Large files (>1MB)
    AND (
        -- Documents with very few extracted tests relative to file size
        (parsed_data::jsonb->'tests' IS NULL OR jsonb_array_length(parsed_data::jsonb->'tests') < 8)
        OR 
        -- Documents that might be missing common test categories
        NOT (
            extracted_text ILIKE '%lipid%' OR 
            extracted_text ILIKE '%cholesterol%' OR
            extracted_text ILIKE '%electrolyte%' OR
            extracted_text ILIKE '%sodium%' OR
            extracted_text ILIKE '%potassium%'
        )
    );

-- Log the reprocessing action
DO $$
DECLARE
    reset_count INTEGER;
BEGIN
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    RAISE NOTICE 'Reset % documents for enhanced reprocessing with comprehensive lab extraction', reset_count;
END $$;