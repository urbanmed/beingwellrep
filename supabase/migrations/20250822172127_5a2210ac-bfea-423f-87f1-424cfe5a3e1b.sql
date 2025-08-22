-- Recovery mechanism: Reset documents with suspiciously short extracted text
-- This identifies and resets documents that may have incomplete text extraction

-- First, let's identify affected documents
DO $$ 
DECLARE 
    affected_count integer;
    doc_record record;
BEGIN
    -- Count documents with suspicious extraction patterns
    SELECT COUNT(*) INTO affected_count
    FROM reports 
    WHERE 
        parsing_status = 'completed' 
        AND (
            LENGTH(COALESCE(extracted_text, '')) < 100 -- Very short text
            OR extracted_text IS NULL 
            OR extracted_text = '' 
        )
        AND file_size > 50000; -- But file is reasonably large
    
    RAISE NOTICE 'Found % documents with potential incomplete text extraction', affected_count;
    
    -- Log details of affected documents
    FOR doc_record IN 
        SELECT id, LENGTH(COALESCE(extracted_text, '')) as text_len, file_size, title
        FROM reports 
        WHERE 
            parsing_status = 'completed' 
            AND (
                LENGTH(COALESCE(extracted_text, '')) < 100
                OR extracted_text IS NULL 
                OR extracted_text = '' 
            )
            AND file_size > 50000
        LIMIT 10
    LOOP
        RAISE NOTICE 'Document ID: %, Text Length: %, File Size: %, Title: %', 
            doc_record.id, doc_record.text_len, doc_record.file_size, doc_record.title;
    END LOOP;
    
    -- Reset affected documents for reprocessing
    UPDATE reports 
    SET 
        parsing_status = 'pending',
        processing_phase = 'pending',
        progress_percentage = 0,
        processing_error = 'Reset due to incomplete text extraction - will reprocess with fixed logic',
        processing_lock = null,
        processing_started_at = null,
        lock_expires_at = null,
        retry_count = 0,
        updated_at = now()
    WHERE 
        parsing_status = 'completed' 
        AND (
            LENGTH(COALESCE(extracted_text, '')) < 100
            OR extracted_text IS NULL 
            OR extracted_text = '' 
        )
        AND file_size > 50000;
        
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RAISE NOTICE 'Reset % documents for reprocessing with fixed text extraction logic', affected_count;
END $$;