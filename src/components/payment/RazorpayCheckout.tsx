import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayCheckoutProps {
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  onSuccess?: (paymentId: string, orderId: string, signature: string) => void;
  onFailure?: (error: any) => void;
  children: React.ReactNode;
}

export const RazorpayCheckout: React.FC<RazorpayCheckoutProps> = ({
  planId,
  billingCycle,
  onSuccess,
  onFailure,
  children
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [scriptLoaded, setScriptLoaded] = React.useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay script');
      toast({
        title: "Payment Error",
        description: "Failed to load payment system. Please try again.",
        variant: "destructive",
      });
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [toast]);

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to continue with payment.",
        variant: "destructive",
      });
      return;
    }

    if (!scriptLoaded) {
      toast({
        title: "Payment Error",
        description: "Payment system is still loading. Please try again.",
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
          body: { planId, billingCycle }
        }
      );

      if (orderError) throw orderError;

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'HealthVault Pro',
        description: `${billingCycle} subscription`,
        order_id: orderData.orderId,
        prefill: {
          name: user.user_metadata?.first_name || user.email?.split('@')[0] || '',
          email: user.email,
          contact: user.user_metadata?.phone_number || ''
        },
        theme: {
          color: 'hsl(var(--primary))'
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          }
        },
        handler: async (response: any) => {
          try {
            // Create subscription with payment details
            const { data: subscriptionData, error: subscriptionError } = await supabase.functions.invoke(
              'create-razorpay-subscription',
              {
                body: {
                  planId,
                  billingCycle,
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id,
                  signature: response.razorpay_signature
                }
              }
            );

            if (subscriptionError) throw subscriptionError;

            toast({
              title: "Payment Successful!",
              description: "Your subscription has been activated successfully.",
            });

            onSuccess?.(response.razorpay_payment_id, response.razorpay_order_id, response.razorpay_signature);
          } catch (error) {
            console.error('Subscription creation error:', error);
            toast({
              title: "Subscription Error",
              description: "Payment successful but subscription setup failed. Please contact support.",
              variant: "destructive",
            });
            onFailure?.(error);
          }
          setLoading(false);
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', (response: any) => {
        toast({
          title: "Payment Failed",
          description: response.error.description || "Payment was not successful. Please try again.",
          variant: "destructive",
        });
        onFailure?.(response.error);
        setLoading(false);
      });

      razorpay.open();
    } catch (error) {
      console.error('Payment initiation error:', error);
      toast({
        title: "Payment Error",
        description: "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div onClick={handlePayment}>
      {React.cloneElement(children as React.ReactElement, {
        disabled: loading || !scriptLoaded,
        children: loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Processing...
          </>
        ) : (children as React.ReactElement).props.children
      })}
    </div>
  );
};