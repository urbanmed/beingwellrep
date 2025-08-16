import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, ArrowRight, SkipForward, CreditCard } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { MobileRazorpayCheckout } from "@/components/payment/MobileRazorpayCheckout";

interface OnboardingStep5Props {
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export function OnboardingStep5({ onNext, onSkip, onBack }: OnboardingStep5Props) {
  const { plans, loading } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Choose Your Plan</h2>
          <p className="text-muted-foreground">Loading plans...</p>
        </div>
      </div>
    );
  }

  const featuredPlans = plans.filter(plan => plan.name !== 'free').slice(0, 2);

  const handlePaymentSuccess = () => {
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Crown className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Choose Your Plan</h2>
        </div>
        <p className="text-muted-foreground">
          Start with a plan that fits your health management needs
        </p>
      </div>

      {/* Free Plan Option */}
      <Card className="border-2 border-dashed border-muted-foreground/30">
        <CardHeader className="text-center pb-4">
          <CardTitle className="flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Start Free
          </CardTitle>
          <CardDescription>
            Begin your health journey with our basic features
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="space-y-4">
            <div className="text-3xl font-bold">₹0</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                5 documents per month
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Basic AI insights
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                1 family member
              </li>
            </ul>
            <Button onClick={onSkip} variant="outline" className="w-full">
              Continue with Free Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Premium Plans */}
      <div className="space-y-4">
        <h3 className="font-semibold text-center">Or upgrade for more features</h3>
        
        {featuredPlans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`cursor-pointer transition-all ${
              selectedPlan === plan.id 
                ? 'border-primary shadow-lg ring-2 ring-primary/20' 
                : 'hover:border-primary/50'
            }`}
            onClick={() => setSelectedPlan(plan.id)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-primary" />
                    {plan.display_name}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </div>
                {plan.name === 'premium' && (
                  <Badge variant="default">Most Popular</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">
                    ₹{plan.price_monthly?.toLocaleString('en-IN')}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>

                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {plan.features.documents_per_month} documents per month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {plan.features.ai_queries_per_month} AI queries per month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {plan.features.family_members} family members
                  </li>
                  {plan.features.priority_support && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Priority support
                    </li>
                  )}
                  {plan.features.advanced_analytics && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Advanced analytics
                    </li>
                  )}
                </ul>

                <MobileRazorpayCheckout
                  plan={plan}
                  billingCycle="monthly"
                  onSuccess={handlePaymentSuccess}
                >
                  <Button 
                    className={`w-full ${
                      selectedPlan === plan.id 
                        ? 'bg-primary hover:bg-primary/90' 
                        : 'bg-primary/80 hover:bg-primary'
                    }`}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Start {plan.display_name} Plan
                  </Button>
                </MobileRazorpayCheckout>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button onClick={onBack} variant="outline">
          Back
        </Button>
        
        <Button onClick={onSkip} variant="ghost" className="text-muted-foreground">
          <SkipForward className="h-4 w-4 mr-2" />
          Skip for now
        </Button>
      </div>
    </div>
  );
}