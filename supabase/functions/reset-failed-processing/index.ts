import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Clean up expired processing locks first
    console.log('🧹 Cleaning up expired processing locks...');
    await supabaseClient.rpc('cleanup_expired_processing_locks');

    // Reset failed documents to allow reprocessing
    console.log('🔄 Resetting failed documents...');
    const { data: resetData, error: resetError } = await supabaseClient
      .from('reports')
      .update({
        parsing_status: 'pending',
        processing_phase: 'pending',
        progress_percentage: 0,
        processing_error: null,
        processing_lock: null,
        processing_started_at: null,
        lock_expires_at: null,
        retry_count: 0
      })
      .or('parsing_status.eq.failed,processing_phase.eq.failed')
      .select('id, title');

    if (resetError) {
      console.error('❌ Error resetting failed documents:', resetError);
      throw resetError;
    }

    // Get stuck documents (processing for too long)
    console.log('🔄 Finding stuck documents...');
    const { data: stuckData, error: stuckError } = await supabaseClient
      .from('reports')
      .update({
        parsing_status: 'pending',
        processing_phase: 'pending',
        progress_percentage: 0,
        processing_error: 'Reset due to stuck processing',
        processing_lock: null,
        processing_started_at: null,
        lock_expires_at: null
      })
      .lt('processing_started_at', new Date(Date.now() - 20 * 60 * 1000).toISOString()) // 20 minutes ago
      .in('parsing_status', ['processing'])
      .select('id, title');

    if (stuckError) {
      console.error('❌ Error resetting stuck documents:', stuckError);
      throw stuckError;
    }

    const totalReset = (resetData?.length || 0) + (stuckData?.length || 0);

    console.log(`✅ Reset complete: ${totalReset} documents ready for reprocessing`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully reset ${totalReset} documents for reprocessing`,
        resetDocuments: resetData || [],
        stuckDocuments: stuckData || []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('❌ Reset failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})