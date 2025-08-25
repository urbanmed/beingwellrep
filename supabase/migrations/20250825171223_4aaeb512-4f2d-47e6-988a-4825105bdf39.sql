-- Fix for incomplete AI parsing - Reset recent failed documents for reprocessing
-- This addresses the "chunkPrompt is not defined" error that prevented proper data extraction

-- Reset the specific document reported by user (praveen-report-15-Feb-2025.pdf)
UPDATE reports 
SET 
    parsing_status = 'pending',
    processing_phase = 'pending',
    progress_percentage = 0,
    processing_error = 'Reprocessing after fixing chunkPrompt bug - enhanced extraction enabled',
    processing_lock = null,
    processing_started_at = null,
    lock_expires_at = null,
    retry_count = 0,
    updated_at = now()
WHERE 
    file_name ILIKE '%praveen-report-15-Feb-2025%'
    OR title ILIKE '%praveen-report-15-Feb%'
    OR (
        parsing_status = 'completed' 
        AND (parsed_data IS NULL OR parsed_data::text = '{}' OR parsed_data::text = 'null')
        AND created_at > '2025-08-22 17:00:00'::timestamp
    );

-- Also reset any other recent documents that failed with similar issues
UPDATE reports 
SET 
    parsing_status = 'pending',
    processing_phase = 'pending', 
    progress_percentage = 0,
    processing_error = 'Reprocessing after chunkPrompt bug fix',
    processing_lock = null,
    processing_started_at = null,
    lock_expires_at = null,
    retry_count = 0,
    updated_at = now()
WHERE 
    parsing_status = 'completed'
    AND created_at > '2025-08-22 16:00:00'::timestamp
    AND (
        parsed_data IS NULL 
        OR parsed_data::text = '{}' 
        OR parsed_data::text = 'null'
        OR (parsed_data::jsonb ? 'tests' AND jsonb_array_length(parsed_data::jsonb->'tests') = 0)
    );

-- Log the reset action
DO $$
DECLARE
    reset_count INTEGER;
BEGIN
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    RAISE NOTICE 'Reset % documents for reprocessing after fixing chunkPrompt bug', reset_count;
END $$;