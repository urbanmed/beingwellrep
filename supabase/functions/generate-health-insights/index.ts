import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !userData.user) {
      throw new Error('Invalid authentication');
    }

    console.log('Generating health insights for user:', userData.user.id);

    // Start background processing
    EdgeRuntime.waitUntil(generateInsights(userData.user.id));

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Insight generation started'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-health-insights function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function generateInsights(userId: string) {
  try {
    console.log('Starting insight generation for user:', userId);

    // Get user data
    const [reportsResult, summariesResult, profileResult] = await Promise.all([
      supabase
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
      
      supabase
        .from('summaries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
      
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
    ]);

    const reports = reportsResult.data || [];
    const summaries = summariesResult.data || [];
    const profile = profileResult.data;

    // Generate different types of insights
    const insights = await Promise.all([
      generateTrendInsight(userId, reports, summaries),
      generateRiskInsight(userId, reports, profile),
      generateRecommendationInsight(userId, reports, summaries),
      generateMilestoneInsight(userId, reports)
    ]);

    // Filter out null insights and insert valid ones
    const validInsights = insights.filter(insight => insight !== null);
    
    if (validInsights.length > 0) {
      const { error: insertError } = await supabase
        .from('health_insights')
        .insert(validInsights);

      if (insertError) {
        console.error('Error inserting insights:', insertError);
      } else {
        console.log(`Generated ${validInsights.length} insights for user ${userId}`);
        
        // Create notification
        await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            title: 'New Health Insights Available',
            message: `We've generated ${validInsights.length} new health insights based on your recent data.`,
            type: 'info',
            category: 'health',
            priority: 2,
          });
      }
    }

  } catch (error) {
    console.error('Error generating insights:', error);
  }
}

async function generateTrendInsight(userId: string, reports: any[], summaries: any[]) {
  if (reports.length < 3) return null;

  // Analyze trends in reports over time
  const recentReports = reports.slice(0, 5);
  const olderReports = reports.slice(5, 10);

  if (recentReports.length === 0 || olderReports.length === 0) return null;

  return {
    user_id: userId,
    insight_type: 'trend',
    title: 'Health Data Trends',
    description: `Based on your recent ${recentReports.length} reports compared to previous data, we've identified patterns in your health metrics.`,
    severity: 'info',
    confidence_score: 0.75,
    data_source_ids: recentReports.map(r => r.id),
    insight_data: {
      recentCount: recentReports.length,
      previousCount: olderReports.length,
      timeframe: '30 days'
    },
    action_items: [
      'Review your recent test results',
      'Discuss trends with your healthcare provider'
    ],
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  };
}

async function generateRiskInsight(userId: string, reports: any[], profile: any) {
  if (!profile || reports.length < 2) return null;

  // Check for potential risk factors
  const criticalReports = reports.filter(r => r.is_critical);
  
  if (criticalReports.length > 0) {
    return {
      user_id: userId,
      insight_type: 'risk',
      title: 'Health Risk Assessment',
      description: `We found ${criticalReports.length} reports marked as critical that may require attention.`,
      severity: 'warning',
      confidence_score: 0.85,
      data_source_ids: criticalReports.map(r => r.id),
      insight_data: {
        criticalCount: criticalReports.length,
        totalReports: reports.length
      },
      action_items: [
        'Review critical reports with your doctor',
        'Schedule follow-up appointments if needed'
      ],
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };
  }

  return null;
}

async function generateRecommendationInsight(userId: string, reports: any[], summaries: any[]) {
  if (reports.length === 0) return null;

  const hasLabResults = reports.some(r => r.report_type === 'lab_results');
  const hasImaging = reports.some(r => r.report_type === 'imaging');

  if (!hasLabResults && !hasImaging) {
    return {
      user_id: userId,
      insight_type: 'recommendation',
      title: 'Complete Your Health Profile',
      description: 'Consider uploading lab results and imaging reports for more comprehensive health insights.',
      severity: 'info',
      confidence_score: 0.60,
      data_source_ids: reports.slice(0, 3).map(r => r.id),
      insight_data: {
        hasLabResults,
        hasImaging,
        totalReports: reports.length
      },
      action_items: [
        'Upload recent lab results',
        'Add imaging reports if available',
        'Ensure all report types are covered'
      ],
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days
    };
  }

  return null;
}

async function generateMilestoneInsight(userId: string, reports: any[]) {
  if (reports.length < 10) return null;

  // Check for milestones
  const milestones = [
    { count: 10, message: '10 health reports uploaded' },
    { count: 25, message: '25 health reports uploaded' },
    { count: 50, message: '50 health reports uploaded' },
    { count: 100, message: '100 health reports uploaded' }
  ];

  const currentMilestone = milestones
    .reverse()
    .find(m => reports.length >= m.count);

  if (currentMilestone && reports.length === currentMilestone.count) {
    return {
      user_id: userId,
      insight_type: 'milestone',
      title: 'Health Milestone Achieved!',
      description: `Congratulations! You've reached a milestone: ${currentMilestone.message}. Your commitment to tracking your health data is commendable.`,
      severity: 'info',
      confidence_score: 1.00,
      data_source_ids: [],
      insight_data: {
        milestone: currentMilestone.count,
        totalReports: reports.length
      },
      action_items: [
        'Keep up the great work with data tracking',
        'Review your health journey progress'
      ],
      expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() // 60 days
    };
  }

  return null;
}