-- Phase 1: Add Processing Lock Mechanism
ALTER TABLE public.reports 
ADD COLUMN processing_lock uuid DEFAULT NULL,
ADD COLUMN processing_started_at timestamp with time zone DEFAULT NULL,
ADD COLUMN lock_expires_at timestamp with time zone DEFAULT NULL;

-- Phase 2: Enhance Status Tracking Granularity  
ALTER TABLE public.reports 
ADD COLUMN processing_phase text DEFAULT 'pending',
ADD COLUMN progress_percentage integer DEFAULT 0,
ADD COLUMN retry_count integer DEFAULT 0,
ADD COLUMN max_retries integer DEFAULT 3,
ADD COLUMN last_retry_at timestamp with time zone DEFAULT NULL,
ADD COLUMN error_category text DEFAULT NULL;

-- Add index for processing locks to improve performance
CREATE INDEX idx_reports_processing_lock ON public.reports(processing_lock) WHERE processing_lock IS NOT NULL;
CREATE INDEX idx_reports_lock_expires ON public.reports(lock_expires_at) WHERE lock_expires_at IS NOT NULL;

-- Create function to clean up expired locks
CREATE OR REPLACE FUNCTION public.cleanup_expired_processing_locks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create function to acquire processing lock
CREATE OR REPLACE FUNCTION public.acquire_processing_lock(report_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create function to release processing lock
CREATE OR REPLACE FUNCTION public.release_processing_lock(report_id_param uuid, final_status text DEFAULT 'completed')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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