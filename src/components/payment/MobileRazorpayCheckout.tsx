import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Loader2, CreditCard, CheckCircle, XCircle, Smartphone, Shield } from 'lucide-react';
import { SubscriptionPlan } from '@/hooks/useSubscription';

interface MobileRazorpayCheckoutProps {
  plan: SubscriptionPlan;
  billingCycle: 'monthly' | 'yearly';
  onSuccess?: (subscriptionId: string) => void;
  onFailure?: (error: any) => void;
  children?: React.ReactNode;
  trigger?: React.ReactNode;
}

export const MobileRazorpayCheckout: React.FC<MobileRazorpayCheckoutProps> = ({
  plan,
  billingCycle,
  onSuccess,
  onFailure,
  children,
  trigger
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

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
    setPaymentStatus('processing');

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
        name: 'BeingWell',
        description: `${plan.display_name} - ${billingCycle} subscription`,
        order_id: orderData.order.id,
        theme: {
          color: 'hsl(var(--primary))',
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setPaymentStatus('idle');
          }
        },
        handler: async (response: any) => {
          try {
            setPaymentStatus('processing');
            
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

            setPaymentStatus('success');
            
            toast({
              title: "Subscription Activated!",
              description: `Welcome to ${plan.display_name}! Your subscription is now active.`,
            });

            setTimeout(() => {
              setIsOpen(false);
              onSuccess?.(subscriptionData.subscription.id);
            }, 2000);
          } catch (error) {
            console.error('Subscription creation error:', error);
            setPaymentStatus('error');
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
      setPaymentStatus('error');
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
  const savings = billingCycle === 'yearly' && plan.price_yearly && plan.price_monthly
    ? ((plan.price_monthly * 12) - plan.price_yearly)
    : 0;

  const PaymentContent = () => (
    <div className="space-y-6">
      {/* Plan Summary */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-lg">{plan.display_name}</h3>
        <p className="text-sm text-muted-foreground">{plan.description}</p>
        
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">₹{amount?.toLocaleString('en-IN')}</span>
          <span className="text-sm text-muted-foreground">
            /{billingCycle === 'monthly' ? 'month' : 'year'}
          </span>
        </div>
        
        {savings > 0 && (
          <div className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-sm p-2 rounded">
            Save ₹{savings.toLocaleString('en-IN')} annually!
          </div>
        )}
      </div>

      {/* Security Features */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Shield className="h-4 w-4" />
        <span>256-bit SSL encryption</span>
      </div>

      {/* Mobile Optimized Features */}
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span>Instant activation</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span>Cancel anytime</span>
        </div>
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" />
          <span>Mobile-optimized experience</span>
        </div>
      </div>

      {/* Payment Status */}
      {paymentStatus === 'processing' && (
        <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Processing your payment...</span>
        </div>
      )}

      {paymentStatus === 'success' && (
        <div className="flex items-center justify-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span>Payment successful! Redirecting...</span>
        </div>
      )}

      {paymentStatus === 'error' && (
        <div className="flex items-center justify-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <XCircle className="h-4 w-4 text-red-500" />
          <span>Payment failed. Please try again.</span>
        </div>
      )}

      {/* Payment Button */}
      <Button
        onClick={handlePayment}
        disabled={loading || !razorpayLoaded || paymentStatus === 'success'}
        className="w-full h-12 text-base"
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
    </div>
  );

  const TriggerButton = trigger || (
    <Button onClick={() => setIsOpen(true)} className="w-full">
      Subscribe to {plan.display_name}
    </Button>
  );

  if (children) {
    return (
      <>
        <div onClick={() => setIsOpen(true)} className="cursor-pointer">
          {children}
        </div>
        
        {isMobile ? (
          <Drawer open={isOpen} onOpenChange={setIsOpen}>
            <DrawerContent className="max-h-[90vh]">
              <DrawerHeader>
                <DrawerTitle>Subscribe to {plan.display_name}</DrawerTitle>
                <DrawerDescription>
                  Choose your payment method and complete your subscription
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-4 pb-4">
                <PaymentContent />
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Subscribe to {plan.display_name}</DialogTitle>
                <DialogDescription>
                  Choose your payment method and complete your subscription
                </DialogDescription>
              </DialogHeader>
              <PaymentContent />
            </DialogContent>
          </Dialog>
        )}
      </>
    );
  }

  return TriggerButton;
};