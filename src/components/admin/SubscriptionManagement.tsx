import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Search, Users, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

interface SubscriptionStats {
  total_users: number;
  active_subscriptions: number;
  monthly_revenue: number;
  churn_rate: number;
}

interface UserSubscriptionData {
  id: string;
  user_id: string;
  email: string;
  subscription_plan: {
    display_name: string;
    price_monthly: number;
  };
  status: string;
  current_period_end: string;
  created_at: string;
}

export const SubscriptionManagement = () => {
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [subscriptions, setSubscriptions] = useState<UserSubscriptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const pageSize = 10;

  const fetchStats = async () => {
    try {
      // Get total users count
      const { count: totalUsers, error: usersError } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // Get active subscriptions
      const { count: activeCount, error: activeError } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (activeError) throw activeError;

      // Calculate revenue (simplified - would need billing_history for accurate calculation)
      const { data: revenueData, error: revenueError } = await supabase
        .from('user_subscriptions')
        .select(`
          subscription_plan:subscription_plans(price_monthly)
        `)
        .eq('status', 'active');

      if (revenueError) throw revenueError;

      const monthlyRevenue = revenueData?.reduce((sum, sub) => {
        return sum + (sub.subscription_plan?.price_monthly || 0);
      }, 0) || 0;

      setStats({
        total_users: totalUsers || 0,
        active_subscriptions: activeCount || 0,
        monthly_revenue: monthlyRevenue / 100, // Convert from cents
        churn_rate: 0 // Would need historical data to calculate
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Error",
        description: "Failed to load subscription statistics",
        variant: "destructive",
      });
    }
  };

  const fetchSubscriptions = async () => {
    try {
      let query = supabase
        .from('user_subscriptions')
        .select(`
          id,
          user_id,
          status,
          current_period_end,
          created_at,
          subscription_plan:subscription_plans(display_name, price_monthly)
        `)
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get user emails (would need to join with profiles or auth.users in real implementation)
      const subscriptionsWithEmails = data?.map(sub => ({
        ...sub,
        email: `user${sub.user_id.slice(0, 8)}@email.com` // Placeholder
      })) || [];

      setSubscriptions(subscriptionsWithEmails as UserSubscriptionData[]);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast({
        title: "Error",
        description: "Failed to load subscriptions",
        variant: "destructive",
      });
    }
  };

  const updateSubscriptionStatus = async (subscriptionId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ status: newStatus })
        .eq('id', subscriptionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subscription status updated successfully",
      });

      fetchSubscriptions();
      fetchStats();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        title: "Error",
        description: "Failed to update subscription status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      trialing: 'secondary',
      past_due: 'destructive',
      cancelled: 'outline',
      unpaid: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchSubscriptions()]);
      setLoading(false);
    };

    loadData();
  }, [currentPage, statusFilter]);

  if (loading) {
    return <div className="p-6">Loading subscription data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_subscriptions || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.monthly_revenue || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.churn_rate || 0}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Subscriptions</CardTitle>
          <CardDescription>
            Manage user subscriptions and billing status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trialing">Trialing</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Period End</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{subscription.email}</div>
                      <div className="text-sm text-muted-foreground">
                        {subscription.user_id.slice(0, 8)}...
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{subscription.subscription_plan?.display_name}</TableCell>
                  <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                  <TableCell>
                    ${(subscription.subscription_plan?.price_monthly || 0) / 100}/mo
                  </TableCell>
                  <TableCell>
                    {subscription.current_period_end 
                      ? new Date(subscription.current_period_end).toLocaleDateString()
                      : 'N/A'
                    }
                  </TableCell>
                  <TableCell>
                    <Select
                      value={subscription.status}
                      onValueChange={(value) => updateSubscriptionStatus(subscription.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="trialing">Trialing</SelectItem>
                        <SelectItem value="past_due">Past Due</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {subscriptions.length} subscriptions
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={subscriptions.length < pageSize}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};