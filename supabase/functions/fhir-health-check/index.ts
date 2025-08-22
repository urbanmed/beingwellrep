import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

    const { userId = null, days = 7 } = await req.json()
    
    console.log(`Running FHIR health check for last ${days} days${userId ? ` for user ${userId}` : ''}`)

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    // Get reports from the specified period
    let reportsQuery = supabaseClient
      .from('reports')
      .select('id, user_id, title, report_type, parsing_status, created_at, parsed_data')
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })

    if (userId) {
      reportsQuery = reportsQuery.eq('user_id', userId)
    }

    const { data: reports, error: reportsError } = await reportsQuery

    if (reportsError) {
      throw new Error(`Failed to fetch reports: ${reportsError.message}`)
    }

    // Get FHIR resources counts
    const { data: fhirPatients, error: patientsError } = await supabaseClient
      .from('fhir_patients')
      .select('id, user_id, created_at')
      .gte('created_at', cutoffDate.toISOString())

    const { data: fhirObservations, error: obsError } = await supabaseClient
      .from('fhir_observations')
      .select('id, source_report_id, user_id, observation_type, created_at')
      .gte('created_at', cutoffDate.toISOString())

    const { data: fhirMedicationRequests, error: medError } = await supabaseClient
      .from('fhir_medication_requests')
      .select('id, source_report_id, user_id, created_at')
      .gte('created_at', cutoffDate.toISOString())

    const { data: fhirDiagnosticReports, error: diagError } = await supabaseClient
      .from('fhir_diagnostic_reports')
      .select('id, source_report_id, user_id, report_type, created_at')
      .gte('created_at', cutoffDate.toISOString())

    if (patientsError || obsError || medError || diagError) {
      throw new Error('Failed to fetch FHIR resources')
    }

    // Analyze the data
    const totalReports = reports?.length || 0
    const completedReports = reports?.filter(r => r.parsing_status === 'completed')?.length || 0
    const failedReports = reports?.filter(r => r.parsing_status === 'failed')?.length || 0
    const processingReports = reports?.filter(r => r.parsing_status === 'processing')?.length || 0

    // Check FHIR coverage
    const reportsWithFHIR = new Set()
    
    fhirObservations?.forEach(obs => reportsWithFHIR.add(obs.source_report_id))
    fhirMedicationRequests?.forEach(med => reportsWithFHIR.add(med.source_report_id))
    fhirDiagnosticReports?.forEach(diag => reportsWithFHIR.add(diag.source_report_id))

    const completedReportsWithFHIR = reports
      ?.filter(r => r.parsing_status === 'completed' && reportsWithFHIR.has(r.id))?.length || 0
    
    const completedReportsWithoutFHIR = completedReports - completedReportsWithFHIR
    const fhirCoverageRate = completedReports > 0 ? (completedReportsWithFHIR / completedReports * 100) : 0

    // Analyze report types
    const reportTypeStats = {}
    reports?.forEach(report => {
      const type = report.report_type || 'unknown'
      if (!reportTypeStats[type]) {
        reportTypeStats[type] = { total: 0, completed: 0, withFHIR: 0 }
      }
      reportTypeStats[type].total++
      if (report.parsing_status === 'completed') {
        reportTypeStats[type].completed++
        if (reportsWithFHIR.has(report.id)) {
          reportTypeStats[type].withFHIR++
        }
      }
    })

    // Analyze FHIR resource types
    const fhirResourceStats = {
      patients: fhirPatients?.length || 0,
      observations: fhirObservations?.length || 0,
      medicationRequests: fhirMedicationRequests?.length || 0,
      diagnosticReports: fhirDiagnosticReports?.length || 0
    }

    // Check for data quality issues
    const issues = []
    
    if (fhirCoverageRate < 90) {
      issues.push({
        severity: 'warning',
        message: `FHIR coverage rate is ${fhirCoverageRate.toFixed(1)}% (${completedReportsWithoutFHIR} completed reports without FHIR resources)`
      })
    }

    if (failedReports > totalReports * 0.1) {
      issues.push({
        severity: 'error',
        message: `High failure rate: ${failedReports}/${totalReports} reports failed (${(failedReports/totalReports*100).toFixed(1)}%)`
      })
    }

    if (processingReports > 5) {
      issues.push({
        severity: 'warning',
        message: `${processingReports} reports stuck in processing status`
      })
    }

    // Find reports that might need reprocessing
    const problematicReports = reports
      ?.filter(r => 
        r.parsing_status === 'completed' && 
        !reportsWithFHIR.has(r.id) && 
        r.parsed_data
      )
      ?.slice(0, 10) // Limit to first 10
      ?.map(r => ({
        id: r.id,
        title: r.title,
        report_type: r.report_type,
        created_at: r.created_at,
        has_parsed_data: !!r.parsed_data
      }))

    const healthStatus = issues.length === 0 ? 'healthy' : 
                        issues.some(i => i.severity === 'error') ? 'critical' : 'warning'

    const result = {
      healthStatus,
      timestamp: new Date().toISOString(),
      period: {
        days,
        from: cutoffDate.toISOString(),
        to: new Date().toISOString()
      },
      reportStatistics: {
        total: totalReports,
        completed: completedReports,
        failed: failedReports,
        processing: processingReports,
        fhirCoverageRate: parseFloat(fhirCoverageRate.toFixed(1)),
        completedWithFHIR: completedReportsWithFHIR,
        completedWithoutFHIR: completedReportsWithoutFHIR
      },
      reportTypeBreakdown: reportTypeStats,
      fhirResourceCounts: fhirResourceStats,
      issues,
      problematicReports: problematicReports || [],
      recommendations: []
    }

    // Add recommendations based on findings
    if (completedReportsWithoutFHIR > 0) {
      result.recommendations.push({
        action: 'Run FHIR backfill process',
        description: `${completedReportsWithoutFHIR} completed reports need FHIR resource creation`,
        priority: completedReportsWithoutFHIR > 10 ? 'high' : 'medium'
      })
    }

    if (processingReports > 0) {
      result.recommendations.push({
        action: 'Check stuck reports',
        description: `${processingReports} reports are stuck in processing status and may need manual intervention`,
        priority: 'medium'
      })
    }

    if (failedReports > 0) {
      result.recommendations.push({
        action: 'Review processing errors',
        description: `${failedReports} reports failed processing and need investigation`,
        priority: 'high'
      })
    }

    console.log('FHIR health check completed:', {
      status: healthStatus,
      coverage: `${fhirCoverageRate.toFixed(1)}%`,
      issues: issues.length,
      recommendations: result.recommendations.length
    })

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('FHIR health check error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        healthStatus: 'critical',
        message: 'FHIR health check failed'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})