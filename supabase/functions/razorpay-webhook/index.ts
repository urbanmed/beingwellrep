import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    const signature = req.headers.get('x-razorpay-signature');
    const body = await req.text();

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      const expectedSignature = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      ).then(key => 
        crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
      ).then(signature => 
        Array.from(new Uint8Array(signature))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
      );

      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return new Response('Invalid signature', { status: 400 });
      }
    }

    const event = JSON.parse(body);
    console.log('Received Razorpay webhook:', event.event);

    switch (event.event) {
      case 'subscription.activated':
        await handleSubscriptionActivated(supabaseClient, event.payload.subscription.entity);
        break;
      
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(supabaseClient, event.payload.subscription.entity);
        break;
      
      case 'subscription.completed':
        await handleSubscriptionCompleted(supabaseClient, event.payload.subscription.entity);
        break;
      
      case 'payment.captured':
        await handlePaymentCaptured(supabaseClient, event.payload.payment.entity);
        break;
      
      case 'payment.failed':
        await handlePaymentFailed(supabaseClient, event.payload.payment.entity);
        break;
      
      default:
        console.log('Unhandled event type:', event.event);
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Error in razorpay-webhook:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});

async function handleSubscriptionActivated(supabaseClient: any, subscription: any) {
  console.log('Handling subscription activated:', subscription.id);
  
  const { error } = await supabaseClient
    .from('user_subscriptions')
    .update({
      status: 'active',
      current_period_start: new Date(subscription.current_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_end * 1000).toISOString(),
    })
    .eq('razorpay_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription status:', error);
  }
}

async function handleSubscriptionCancelled(supabaseClient: any, subscription: any) {
  console.log('Handling subscription cancelled:', subscription.id);
  
  const { error } = await supabaseClient
    .from('user_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_at_period_end: true,
    })
    .eq('razorpay_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription status:', error);
  }
}

async function handleSubscriptionCompleted(supabaseClient: any, subscription: any) {
  console.log('Handling subscription completed:', subscription.id);
  
  const { error } = await supabaseClient
    .from('user_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('razorpay_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription status:', error);
  }
}

async function handlePaymentCaptured(supabaseClient: any, payment: any) {
  console.log('Handling payment captured:', payment.id);
  
  // Get subscription details
  const { data: subscription } = await supabaseClient
    .from('user_subscriptions')
    .select('*')
    .eq('razorpay_subscription_id', payment.subscription_id)
    .single();

  if (subscription) {
    // Create billing history record
    const { error } = await supabaseClient
      .from('billing_history')
      .insert({
        user_id: subscription.user_id,
        subscription_plan_id: subscription.subscription_plan_id,
        razorpay_payment_id: payment.id,
        razorpay_order_id: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        status: 'paid',
        billing_period_start: new Date(subscription.current_period_start).toISOString(),
        billing_period_end: new Date(subscription.current_period_end).toISOString(),
      });

    if (error) {
      console.error('Error creating billing history:', error);
    }

    // Send payment confirmation notification
    await supabaseClient.functions.invoke('send-notification', {
      body: {
        user_id: subscription.user_id,
        title: 'Payment Successful',
        message: `Your payment of ₹${payment.amount / 100} has been processed successfully.`,
        type: 'success',
        category: 'billing'
      }
    });
  }
}

async function handlePaymentFailed(supabaseClient: any, payment: any) {
  console.log('Handling payment failed:', payment.id);
  
  // Get subscription details
  const { data: subscription } = await supabaseClient
    .from('user_subscriptions')
    .select('*')
    .eq('razorpay_subscription_id', payment.subscription_id)
    .single();

  if (subscription) {
    // Create failed billing history record
    const { error } = await supabaseClient
      .from('billing_history')
      .insert({
        user_id: subscription.user_id,
        subscription_plan_id: subscription.subscription_plan_id,
        razorpay_payment_id: payment.id,
        razorpay_order_id: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        status: 'failed',
      });

    if (error) {
      console.error('Error creating billing history:', error);
    }

    // Update subscription status to past_due
    await supabaseClient
      .from('user_subscriptions')
      .update({ status: 'past_due' })
      .eq('razorpay_subscription_id', payment.subscription_id);

    // Send payment failure notification
    await supabaseClient.functions.invoke('send-notification', {
      body: {
        user_id: subscription.user_id,
        title: 'Payment Failed',
        message: `Your payment of ₹${payment.amount / 100} could not be processed. Please update your payment method.`,
        type: 'error',
        category: 'billing',
        action_url: '/profile'
      }
    });
  }
}