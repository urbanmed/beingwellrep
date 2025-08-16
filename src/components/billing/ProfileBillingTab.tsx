import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Crown, CreditCard, Calendar, ArrowRight } from "lucide-react";
import { BillingDashboard } from "./BillingDashboard";

export function ProfileBillingTab() {
  const navigate = useNavigate();
  const { subscription, getCurrentPlan, isSubscriptionActive } = useSubscription();
  
  const currentPlan = getCurrentPlan();
  const isActive = isSubscriptionActive();
  const isFreePlan = currentPlan?.name === 'free';

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Current Plan
              </CardTitle>
              <CardDescription>
                Manage your subscription and billing
              </CardDescription>
            </div>
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <h3 className="font-semibold text-lg">{currentPlan?.display_name || 'Free Plan'}</h3>
              <p className="text-sm text-muted-foreground">
                {currentPlan?.description || 'Basic features with limited usage'}
              </p>
            </div>
            {!isFreePlan && (
              <div className="text-right">
                <p className="font-bold text-lg">
                  ₹{currentPlan?.price_monthly?.toLocaleString('en-IN')}/month
                </p>
                {currentPlan?.price_yearly && (
                  <p className="text-xs text-muted-foreground">
                    or ₹{currentPlan.price_yearly.toLocaleString('en-IN')}/year
                  </p>
                )}
              </div>
            )}
          </div>

          {!isFreePlan && subscription && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Next Billing</p>
                <p className="font-medium">
                  {formatDate(subscription.current_period_end)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{subscription.status}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {isFreePlan ? (
              <Button onClick={() => navigate('/pricing')} className="flex-1">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/pricing')}
                  className="flex-1"
                >
                  Change Plan
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {/* Handle manage subscription */}}
                  className="flex-1"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Manage
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Overview */}
      {currentPlan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Usage This Month
            </CardTitle>
            <CardDescription>
              Track your current usage against plan limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Documents Processed</span>
                  <span>0 / {currentPlan.features.documents_per_month}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>AI Queries</span>
                  <span>0 / {currentPlan.features.ai_queries_per_month}</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Storage Used</span>
                  <span>0 MB / {currentPlan.features.storage_mb} MB</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing History - Only show for paid plans */}
      {!isFreePlan && (
        <BillingDashboard />
      )}
    </div>
  );
}