import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManageSubscriptionRequest {
  action: 'cancel' | 'pause' | 'resume' | 'change_plan';
  planId?: string;
  billingCycle?: 'monthly' | 'yearly';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, planId, billingCycle }: ManageSubscriptionRequest = await req.json();

    // Get current subscription
    const { data: subscription, error: subscriptionError } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subscriptionError || !subscription) {
      return new Response(JSON.stringify({ error: 'Subscription not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    switch (action) {
      case 'cancel':
        await handleCancelSubscription(supabaseClient, subscription, razorpayKeyId, razorpayKeySecret);
        break;
      
      case 'pause':
        await handlePauseSubscription(supabaseClient, subscription, razorpayKeyId, razorpayKeySecret);
        break;
      
      case 'resume':
        await handleResumeSubscription(supabaseClient, subscription, razorpayKeyId, razorpayKeySecret);
        break;
      
      case 'change_plan':
        if (!planId || !billingCycle) {
          return new Response(JSON.stringify({ error: 'Plan ID and billing cycle required for plan change' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        await handleChangePlan(supabaseClient, subscription, planId, billingCycle, razorpayKeyId, razorpayKeySecret);
        break;
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in manage-subscription:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleCancelSubscription(supabaseClient: any, subscription: any, keyId?: string, keySecret?: string) {
  if (subscription.razorpay_subscription_id && keyId && keySecret) {
    // Cancel subscription in Razorpay
    const response = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscription.razorpay_subscription_id}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${keyId}:${keySecret}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancel_at_cycle_end: 1
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error cancelling Razorpay subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  // Update local database
  const { error } = await supabaseClient
    .from('user_subscriptions')
    .update({
      cancel_at_period_end: true,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', subscription.id);

  if (error) {
    throw new Error('Failed to update subscription status');
  }
}

async function handlePauseSubscription(supabaseClient: any, subscription: any, keyId?: string, keySecret?: string) {
  if (subscription.razorpay_subscription_id && keyId && keySecret) {
    // Pause subscription in Razorpay
    const response = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscription.razorpay_subscription_id}/pause`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${keyId}:${keySecret}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pause_at: 'now'
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error pausing Razorpay subscription:', error);
      throw new Error('Failed to pause subscription');
    }
  }

  // Update local database
  const { error } = await supabaseClient
    .from('user_subscriptions')
    .update({
      status: 'paused',
    })
    .eq('id', subscription.id);

  if (error) {
    throw new Error('Failed to update subscription status');
  }
}

async function handleResumeSubscription(supabaseClient: any, subscription: any, keyId?: string, keySecret?: string) {
  if (subscription.razorpay_subscription_id && keyId && keySecret) {
    // Resume subscription in Razorpay
    const response = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscription.razorpay_subscription_id}/resume`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${keyId}:${keySecret}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resume_at: 'now'
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error resuming Razorpay subscription:', error);
      throw new Error('Failed to resume subscription');
    }
  }

  // Update local database
  const { error } = await supabaseClient
    .from('user_subscriptions')
    .update({
      status: 'active',
    })
    .eq('id', subscription.id);

  if (error) {
    throw new Error('Failed to update subscription status');
  }
}

async function handleChangePlan(supabaseClient: any, subscription: any, newPlanId: string, billingCycle: string, keyId?: string, keySecret?: string) {
  // Get new plan details
  const { data: newPlan, error: planError } = await supabaseClient
    .from('subscription_plans')
    .select('*')
    .eq('id', newPlanId)
    .single();

  if (planError || !newPlan) {
    throw new Error('New plan not found');
  }

  if (subscription.razorpay_subscription_id && keyId && keySecret) {
    // Cancel current subscription
    await fetch(`https://api.razorpay.com/v1/subscriptions/${subscription.razorpay_subscription_id}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${keyId}:${keySecret}`)}`,
        'Content-Type': 'application/json',
      },
    });

    // Create new subscription would be handled by calling create-razorpay-subscription endpoint
  }

  // Update local database
  const { error } = await supabaseClient
    .from('user_subscriptions')
    .update({
      subscription_plan_id: newPlanId,
      status: 'active',
    })
    .eq('id', subscription.id);

  if (error) {
    throw new Error('Failed to update subscription plan');
  }
}