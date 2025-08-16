import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateSubscriptionRequest {
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  customerId?: string;
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

    const { planId, billingCycle, customerId }: CreateSubscriptionRequest = await req.json();

    // Get subscription plan details
    const { data: plan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.log('Razorpay credentials not configured, creating placeholder subscription');
      
      // Create a placeholder subscription until Razorpay is configured
      const subscriptionData = {
        user_id: user.id,
        subscription_plan_id: planId,
        status: 'active',
        razorpay_customer_id: null,
        razorpay_subscription_id: null,
        trial_end_date: plan.name === 'free' ? null : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
      };

      const { data: subscription, error: subscriptionError } = await supabaseClient
        .from('user_subscriptions')
        .upsert(subscriptionData, { onConflict: 'user_id' })
        .select()
        .single();

      if (subscriptionError) {
        console.error('Error creating subscription:', subscriptionError);
        return new Response(JSON.stringify({ error: 'Failed to create subscription' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        subscription,
        message: 'Subscription created. Payment integration will be available once Razorpay is configured.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Razorpay customer if not exists
    let razorpayCustomerId = customerId;
    if (!razorpayCustomerId) {
      const customerResponse = await fetch('https://api.razorpay.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          email: user.email,
          contact: profile.phone_number,
        }),
      });

      if (!customerResponse.ok) {
        const error = await customerResponse.text();
        console.error('Error creating Razorpay customer:', error);
        return new Response(JSON.stringify({ error: 'Failed to create customer' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const customer = await customerResponse.json();
      razorpayCustomerId = customer.id;
    }

    // Create Razorpay subscription
    const amount = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
    const interval = billingCycle === 'yearly' ? 12 : 1;

    const subscriptionResponse = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: billingCycle === 'yearly' ? plan.razorpay_plan_id_yearly : plan.razorpay_plan_id_monthly,
        customer_id: razorpayCustomerId,
        quantity: 1,
        total_count: 120, // 10 years worth of billing cycles
        start_at: Math.floor(Date.now() / 1000) + (plan.name === 'free' ? 0 : 14 * 24 * 60 * 60), // 14 day trial for paid plans
        addons: [],
        notes: {
          user_id: user.id,
          plan_name: plan.name,
        },
      }),
    });

    if (!subscriptionResponse.ok) {
      const error = await subscriptionResponse.text();
      console.error('Error creating Razorpay subscription:', error);
      return new Response(JSON.stringify({ error: 'Failed to create subscription' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const razorpaySubscription = await subscriptionResponse.json();

    // Save subscription to database
    const subscriptionData = {
      user_id: user.id,
      subscription_plan_id: planId,
      razorpay_customer_id: razorpayCustomerId,
      razorpay_subscription_id: razorpaySubscription.id,
      status: razorpaySubscription.status,
      trial_end_date: plan.name === 'free' ? null : new Date(razorpaySubscription.start_at * 1000).toISOString(),
      current_period_start: new Date(razorpaySubscription.start_at * 1000).toISOString(),
      current_period_end: new Date((razorpaySubscription.start_at + (interval * 30 * 24 * 60 * 60)) * 1000).toISOString(),
    };

    const { data: subscription, error: subscriptionError } = await supabaseClient
      .from('user_subscriptions')
      .upsert(subscriptionData, { onConflict: 'user_id' })
      .select()
      .single();

    if (subscriptionError) {
      console.error('Error saving subscription:', subscriptionError);
      return new Response(JSON.stringify({ error: 'Failed to save subscription' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      subscription,
      razorpay_subscription: razorpaySubscription
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-razorpay-subscription:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});