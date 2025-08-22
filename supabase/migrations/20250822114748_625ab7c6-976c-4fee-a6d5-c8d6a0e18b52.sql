-- Fix security warnings by setting search_path for all functions

-- Update cleanup_expired_processing_locks function with search_path
CREATE OR REPLACE FUNCTION public.cleanup_expired_processing_locks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.reports 
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
END;
$$;

-- Update acquire_processing_lock function with search_path
CREATE OR REPLACE FUNCTION public.acquire_processing_lock(report_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  lock_id uuid;
  success boolean := false;
BEGIN
  -- Generate a unique lock ID
  lock_id := gen_random_uuid();
  
  -- Clean up any expired locks first
  PERFORM cleanup_expired_processing_locks();
  
  -- Try to acquire the lock atomically
  UPDATE public.reports 
  SET 
    processing_lock = lock_id,
    processing_started_at = now(),
    lock_expires_at = now() + interval '10 minutes',
    processing_phase = 'starting',
    parsing_status = 'processing'
  WHERE 
    id = report_id_param
    AND (processing_lock IS NULL OR lock_expires_at < now())
    AND parsing_status IN ('pending', 'failed');
    
  -- Check if we successfully acquired the lock
  SELECT EXISTS(
    SELECT 1 FROM public.reports 
    WHERE id = report_id_param AND processing_lock = lock_id
  ) INTO success;
  
  RETURN success;
END;
$$;

-- Update release_processing_lock function with search_path
CREATE OR REPLACE FUNCTION public.release_processing_lock(report_id_param uuid, final_status text DEFAULT 'completed')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.reports 
  SET 
    processing_lock = NULL,
    processing_started_at = NULL,
    lock_expires_at = NULL,
    parsing_status = final_status,
    processing_phase = CASE 
      WHEN final_status = 'completed' THEN 'completed'
      WHEN final_status = 'failed' THEN 'failed'
      ELSE processing_phase
    END,
    progress_percentage = CASE 
      WHEN final_status = 'completed' THEN 100
      ELSE progress_percentage
    END,
    updated_at = now()
  WHERE id = report_id_param;
END;
$$;