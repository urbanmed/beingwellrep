import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateOrderRequest {
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  promoCode?: string;
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

    const { planId, billingCycle, promoCode }: CreateOrderRequest = await req.json();

    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(JSON.stringify({ 
        error: 'Payment gateway not configured. Please contact support.' 
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Calculate amount (in paise)
    let amount = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
    
    // Apply promo code if provided
    if (promoCode) {
      // TODO: Implement promo code logic
      // For now, we'll just log it
      console.log('Promo code applied:', promoCode);
    }

    // Get user profile for customer details
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Create Razorpay order
    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        currency: 'INR',
        receipt: `receipt_${user.id}_${Date.now()}`,
        notes: {
          user_id: user.id,
          plan_id: planId,
          billing_cycle: billingCycle,
          plan_name: plan.name,
        },
      }),
    });

    if (!orderResponse.ok) {
      const error = await orderResponse.text();
      console.error('Error creating Razorpay order:', error);
      return new Response(JSON.stringify({ error: 'Failed to create payment order' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const order = await orderResponse.json();

    // Return order details and checkout options
    return new Response(JSON.stringify({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: razorpayKeyId,
      name: 'HealthVault Pro',
      description: `${plan.display_name} - ${billingCycle} subscription`,
      prefill: {
        name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '',
        email: user.email,
        contact: profile?.phone_number || '',
      },
      notes: order.notes,
      theme: {
        color: '#3B82F6'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-razorpay-order:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});