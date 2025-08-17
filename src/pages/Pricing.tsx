import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Zap, Crown } from 'lucide-react';
import { RazorpayCheckout } from '@/components/payment/RazorpayCheckout';
import { MobileRazorpayCheckout } from '@/components/payment/MobileRazorpayCheckout';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';

const PricingPage: React.FC = () => {
  const { user } = useAuth();
  const { plans, subscription, loading } = useSubscription();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const currentPlanId = subscription?.subscription_plan_id;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price / 100);
  };

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'basic': return <Sparkles className="h-5 w-5" />;
      case 'premium': return <Zap className="h-5 w-5" />;
      case 'enterprise': return <Crown className="h-5 w-5" />;
      default: return null;
    }
  };

  const handlePaymentSuccess = () => {
    navigate('/profile');
  };

  if (loading) {
    return (
      <div className="p-4 space-y-6">
        <div className="text-center medical-label">Loading pricing plans...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="text-center mb-8">
        <h1 className="medical-title mb-4">Choose Your Health Plan</h1>
        <p className="medical-label max-w-2xl mx-auto">
          Start your health journey with our comprehensive medical record management system.
          All paid plans include a 14-day free trial.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlanId === plan.id;
          const isFree = plan.name === 'free';
          const features = plan.features as any;

          return (
            <Card 
              key={plan.id} 
              className={`relative medical-card-shadow ${plan.name === 'premium' ? 'border-primary shadow-lg scale-105' : ''}`}
            >
              {plan.name === 'premium' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge variant="default" className="px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center">
                <div className="flex items-center justify-center mb-2">
                  {getPlanIcon(plan.name)}
                  <CardTitle className="ml-2 medical-label font-semibold">{plan.display_name}</CardTitle>
                </div>
                <CardDescription className="medical-annotation">{plan.description}</CardDescription>
                
                 <div className="space-y-2">
                   <div className="medical-heading font-bold">
                     {isFree ? 'Free' : formatPrice(plan.price_monthly)}
                     {!isFree && <span className="medical-annotation ml-1">/month</span>}
                   </div>
                  {!isFree && plan.price_yearly && (
                    <div className="medical-annotation">
                      or {formatPrice(plan.price_yearly)}/year 
                      <Badge variant="secondary" className="ml-2">Save 17%</Badge>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-primary mr-2" />
                     <span className="medical-annotation">
                       {features.documents_per_month === -1 
                         ? 'Unlimited documents' 
                         : `${features.documents_per_month} documents/month`
                       }
                     </span>
                  </div>
                  
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-primary mr-2" />
                     <span className="medical-annotation">
                       {features.ai_queries_per_month === -1 
                         ? 'Unlimited AI queries' 
                         : `${features.ai_queries_per_month} AI queries/month`
                       }
                     </span>
                  </div>
                  
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-primary mr-2" />
                     <span className="medical-annotation">
                       {features.storage_mb === -1 
                         ? 'Unlimited storage' 
                         : `${features.storage_mb}MB storage`
                       }
                     </span>
                  </div>
                  
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-primary mr-2" />
                     <span className="medical-annotation">
                       {features.family_members === -1 
                         ? 'Unlimited family members' 
                         : `${features.family_members} family members`
                       }
                     </span>
                  </div>
                  
                  {features.export_formats && (
                    <div className="flex items-center">
                      <Check className="h-4 w-4 text-primary mr-2" />
                       <span className="medical-annotation">
                         Export: {features.export_formats.join(', ').toUpperCase()}
                       </span>
                    </div>
                  )}
                  
                  {features.priority_support && (
                    <div className="flex items-center">
                      <Check className="h-4 w-4 text-primary mr-2" />
                      <span className="medical-annotation">Priority support</span>
                    </div>
                  )}
                  
                  {features.advanced_analytics && (
                    <div className="flex items-center">
                      <Check className="h-4 w-4 text-primary mr-2" />
                      <span className="medical-annotation">Advanced analytics</span>
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="pt-6">
                {isCurrentPlan ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : isFree ? (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/signup')}
                  >
                    Get Started Free
                  </Button>
                ) : user ? (
                  <div className="w-full space-y-2">
                    {isMobile ? (
                      <>
                        <MobileRazorpayCheckout
                          plan={plan}
                          billingCycle="monthly"
                          onSuccess={handlePaymentSuccess}
                        >
                          <Button className="w-full">
                            Start Monthly Trial
                          </Button>
                        </MobileRazorpayCheckout>
                        
                        {plan.price_yearly && (
                          <MobileRazorpayCheckout
                            plan={plan}
                            billingCycle="yearly"
                            onSuccess={handlePaymentSuccess}
                          >
                            <Button variant="outline" className="w-full">
                              Start Yearly Trial
                            </Button>
                          </MobileRazorpayCheckout>
                        )}
                      </>
                    ) : (
                      <>
                        <RazorpayCheckout
                          plan={plan}
                          billingCycle="monthly"
                          onSuccess={handlePaymentSuccess}
                        >
                          <Button className="w-full">
                            Start Monthly Trial
                          </Button>
                        </RazorpayCheckout>
                        
                        {plan.price_yearly && (
                          <RazorpayCheckout
                            plan={plan}
                            billingCycle="yearly"
                            onSuccess={handlePaymentSuccess}
                          >
                            <Button variant="outline" className="w-full">
                              Start Yearly Trial
                            </Button>
                          </RazorpayCheckout>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <Button 
                    className="w-full"
                    onClick={() => navigate('/signup')}
                  >
                    Sign Up for Trial
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="mt-12">
        <h2 className="medical-heading-sm text-center mb-6">Frequently Asked Questions</h2>
        <div className="max-w-3xl mx-auto space-y-4">
          <div>
            <h3 className="medical-subheading mb-2">How does the free trial work?</h3>
            <p className="medical-label">
              All paid plans include a 14-day free trial. No credit card required to start. 
              You can cancel anytime during the trial period without being charged.
            </p>
          </div>
          
          <div>
            <h3 className="medical-subheading mb-2">Can I change my plan later?</h3>
            <p className="medical-label">
              Yes, you can upgrade or downgrade your plan at any time. 
              Changes will be reflected in your next billing cycle.
            </p>
          </div>
          
          <div>
            <h3 className="medical-subheading mb-2">What payment methods do you accept?</h3>
            <p className="medical-label">
              We accept all major credit cards, debit cards, UPI, net banking, 
              and popular wallets through our secure Razorpay integration.
            </p>
          </div>
          
          <div>
            <h3 className="medical-subheading mb-2">Is my data secure?</h3>
            <p className="medical-label">
              Absolutely. We use enterprise-grade security with end-to-end encryption 
              and comply with healthcare data protection standards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;