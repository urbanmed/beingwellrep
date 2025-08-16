import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, Download, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface UsageData {
  documents_processed: number;
  ai_queries: number;
  storage_mb: number;
}

interface BillingHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  billing_period_start: string | null;
  billing_period_end: string | null;
  created_at: string;
  invoice_url: string | null;
}

export const BillingDashboard: React.FC = () => {
  const { user } = useAuth();
  const { subscription, getCurrentPlan, refreshSubscription } = useSubscription();
  const [usage, setUsage] = useState<UsageData>({ documents_processed: 0, ai_queries: 0, storage_mb: 0 });
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const currentPlan = getCurrentPlan();

  useEffect(() => {
    if (user) {
      fetchUsageData();
      fetchBillingHistory();
    }
  }, [user]);

  const fetchUsageData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('usage_tracking')
        .select('usage_type, usage_count')
        .eq('user_id', user.id)
        .gte('period_start', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      if (error) throw error;

      const usageMap: UsageData = { documents_processed: 0, ai_queries: 0, storage_mb: 0 };
      data?.forEach(item => {
        if (item.usage_type === 'documents_processed') {
          usageMap.documents_processed = item.usage_count;
        } else if (item.usage_type === 'ai_queries') {
          usageMap.ai_queries = item.usage_count;
        } else if (item.usage_type === 'storage_mb') {
          usageMap.storage_mb = item.usage_count;
        }
      });

      setUsage(usageMap);
    } catch (error) {
      console.error('Error fetching usage data:', error);
    }
  };

  const fetchBillingHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('billing_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setBillingHistory(data || []);
    } catch (error) {
      console.error('Error fetching billing history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const { error } = await supabase.functions.invoke('manage-subscription', {
        body: { action: 'cancel' }
      });

      if (error) throw error;
      await refreshSubscription();
    } catch (error) {
      console.error('Error canceling subscription:', error);
    }
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || statusColors.pending}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return <div className="container mx-auto p-6">Loading billing information...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground">Manage your subscription and view usage details</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download Invoice
        </Button>
      </div>

      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Current Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscription && currentPlan ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="text-2xl font-semibold">{currentPlan.display_name}</p>
                <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                  {subscription.status.toUpperCase()}
                </Badge>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Monthly Cost</p>
                <p className="text-2xl font-semibold">
                  {currentPlan.name === 'free' ? 'Free' : formatCurrency(currentPlan.price_monthly)}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Next Billing Date</p>
                <p className="text-lg font-medium">
                  {subscription.current_period_end 
                    ? formatDate(subscription.current_period_end)
                    : 'N/A'
                  }
                </p>
                {subscription.trial_end_date && new Date(subscription.trial_end_date) > new Date() && (
                  <Badge variant="outline" className="mt-1">
                    Trial ends {formatDate(subscription.trial_end_date)}
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No active subscription found</p>
              <Button className="mt-4">Choose a Plan</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Tracking */}
      {currentPlan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Usage This Month
            </CardTitle>
            <CardDescription>Track your usage across different features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Documents Processed</span>
                  <span className="text-sm text-muted-foreground">
                    {usage.documents_processed} / {currentPlan.features.documents_per_month === -1 ? '∞' : currentPlan.features.documents_per_month}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(usage.documents_processed, currentPlan.features.documents_per_month)} 
                  className="h-2" 
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">AI Queries</span>
                  <span className="text-sm text-muted-foreground">
                    {usage.ai_queries} / {currentPlan.features.ai_queries_per_month === -1 ? '∞' : currentPlan.features.ai_queries_per_month}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(usage.ai_queries, currentPlan.features.ai_queries_per_month)} 
                  className="h-2" 
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Storage Used</span>
                  <span className="text-sm text-muted-foreground">
                    {usage.storage_mb}MB / {currentPlan.features.storage_mb === -1 ? '∞' : `${currentPlan.features.storage_mb}MB`}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(usage.storage_mb, currentPlan.features.storage_mb)} 
                  className="h-2" 
                />
              </div>
            </div>

            {/* Usage Alerts */}
            {(getUsagePercentage(usage.documents_processed, currentPlan.features.documents_per_month) > 80 ||
              getUsagePercentage(usage.ai_queries, currentPlan.features.ai_queries_per_month) > 80 ||
              getUsagePercentage(usage.storage_mb, currentPlan.features.storage_mb) > 80) && (
              <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Usage Alert</p>
                  <p className="text-sm text-yellow-700">
                    You're approaching your plan limits. Consider upgrading to avoid service interruption.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Billing History
          </CardTitle>
          <CardDescription>View your past payments and invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {billingHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingHistory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{formatDate(item.created_at)}</TableCell>
                    <TableCell>{formatCurrency(item.amount, item.currency)}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>
                      {item.billing_period_start && item.billing_period_end
                        ? `${formatDate(item.billing_period_start)} - ${formatDate(item.billing_period_end)}`
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      {item.invoice_url ? (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={item.invoice_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No billing history found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Management */}
      {subscription && subscription.status === 'active' && currentPlan?.name !== 'free' && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription Management</CardTitle>
            <CardDescription>Manage your subscription settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Cancel Subscription</p>
                <p className="text-sm text-muted-foreground">
                  Cancel your subscription. You'll retain access until the end of your billing period.
                </p>
              </div>
              <Button variant="destructive" onClick={handleCancelSubscription}>
                Cancel Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};