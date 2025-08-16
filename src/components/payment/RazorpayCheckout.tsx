import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard } from 'lucide-react';
import { SubscriptionPlan } from '@/hooks/useSubscription';

interface RazorpayCheckoutProps {
  plan: SubscriptionPlan;
  billingCycle: 'monthly' | 'yearly';
  onSuccess?: (subscriptionId: string) => void;
  onFailure?: (error: any) => void;
  children?: React.ReactNode;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const RazorpayCheckout: React.FC<RazorpayCheckoutProps> = ({
  plan,
  billingCycle,
  onSuccess,
  onFailure,
  children
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to subscribe to a plan",
        variant: "destructive",
      });
      return;
    }

    if (!razorpayLoaded) {
      toast({
        title: "Payment System Loading",
        description: "Please wait for the payment system to load",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create Razorpay order
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-razorpay-order',
        {
          body: {
            planId: plan.id,
            billingCycle,
          }
        }
      );

      if (orderError) throw orderError;

      const options = {
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'HealthVault Pro',
        description: `${plan.display_name} - ${billingCycle} subscription`,
        order_id: orderData.order.id,
        theme: {
          color: 'hsl(var(--primary))',
        },
        handler: async (response: any) => {
          try {
            // Create subscription after successful payment
            const { data: subscriptionData, error: subError } = await supabase.functions.invoke(
              'create-razorpay-subscription',
              {
                body: {
                  planId: plan.id,
                  billingCycle,
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id,
                  signature: response.razorpay_signature,
                }
              }
            );

            if (subError) throw subError;

            toast({
              title: "Subscription Activated!",
              description: `Welcome to ${plan.display_name}! Your subscription is now active.`,
            });

            onSuccess?.(subscriptionData.subscription.id);
          } catch (error) {
            console.error('Subscription creation error:', error);
            toast({
              title: "Subscription Error",
              description: "Payment was successful but subscription setup failed. Please contact support.",
              variant: "destructive",
            });
            onFailure?.(error);
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          email: user.email,
          contact: user.phone || '',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Payment initiation error:', error);
      toast({
        title: "Payment Error",
        description: "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
      onFailure?.(error);
      setLoading(false);
    }
  };

  const amount = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;

  if (children) {
    return (
      <div onClick={handlePayment} className="cursor-pointer">
        {children}
      </div>
    );
  }

  return (
    <Button
      onClick={handlePayment}
      disabled={loading || !razorpayLoaded}
      className="w-full"
      size="lg"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4 mr-2" />
          Pay ₹{amount?.toLocaleString('en-IN')}
        </>
      )}
    </Button>
  );
};