import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Users, CreditCard, Globe } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface RevenueMetrics {
  mrr: number;
  arr: number;
  totalRevenue: number;
  activeSubscriptions: number;
  paymentSuccessRate: number;
  averageRevenuePerUser: number;
  churnRate: number;
  growthRate: number;
}

interface RevenueData {
  month: string;
  revenue: number;
  subscriptions: number;
  mrr: number;
}

interface PlanBreakdown {
  plan: string;
  revenue: number;
  subscribers: number;
  percentage: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export const RevenueAnalytics: React.FC = () => {
  const [metrics, setMetrics] = useState<RevenueMetrics>({
    mrr: 0,
    arr: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    paymentSuccessRate: 0,
    averageRevenuePerUser: 0,
    churnRate: 0,
    growthRate: 0
  });
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [planBreakdown, setPlanBreakdown] = useState<PlanBreakdown[]>([]);
  const [timeRange, setTimeRange] = useState('12');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueMetrics();
    fetchRevenueData();
    fetchPlanBreakdown();
  }, [timeRange]);

  const fetchRevenueMetrics = async () => {
    try {
      // Fetch current month MRR
      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      
      const { data: mrrData, error: mrrError } = await supabase
        .from('billing_history')
        .select('amount')
        .eq('status', 'paid')
        .gte('created_at', startOfMonth.toISOString());

      if (mrrError) throw mrrError;

      const mrr = mrrData?.reduce((sum, item) => sum + item.amount, 0) || 0;
      const arr = mrr * 12;

      // Fetch total revenue
      const { data: totalRevenueData, error: totalRevenueError } = await supabase
        .from('billing_history')
        .select('amount')
        .eq('status', 'paid');

      if (totalRevenueError) throw totalRevenueError;

      const totalRevenue = totalRevenueData?.reduce((sum, item) => sum + item.amount, 0) || 0;

      // Fetch active subscriptions
      const { count: activeSubscriptions, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (subscriptionError) throw subscriptionError;

      // Calculate payment success rate
      const { data: allPayments, error: paymentsError } = await supabase
        .from('billing_history')
        .select('status');

      if (paymentsError) throw paymentsError;

      const successfulPayments = allPayments?.filter(p => p.status === 'paid').length || 0;
      const totalPayments = allPayments?.length || 0;
      const paymentSuccessRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

      // Calculate ARPU
      const averageRevenuePerUser = activeSubscriptions > 0 ? mrr / activeSubscriptions : 0;

      setMetrics({
        mrr: mrr / 100, // Convert from paisa to rupees
        arr: arr / 100,
        totalRevenue: totalRevenue / 100,
        activeSubscriptions: activeSubscriptions || 0,
        paymentSuccessRate,
        averageRevenuePerUser: averageRevenuePerUser / 100,
        churnRate: 5.2, // Placeholder
        growthRate: 12.5 // Placeholder
      });

    } catch (error) {
      console.error('Error fetching revenue metrics:', error);
    }
  };

  const fetchRevenueData = async () => {
    try {
      const months = parseInt(timeRange);
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const { data, error } = await supabase
        .from('billing_history')
        .select('amount, created_at')
        .eq('status', 'paid')
        .gte('created_at', startDate.toISOString())
        .order('created_at');

      if (error) throw error;

      // Group by month
      const monthlyData: { [key: string]: { revenue: number; count: number } } = {};
      
      data?.forEach(item => {
        const date = new Date(item.created_at);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { revenue: 0, count: 0 };
        }
        
        monthlyData[monthKey].revenue += item.amount;
        monthlyData[monthKey].count += 1;
      });

      const chartData = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        revenue: data.revenue / 100,
        subscriptions: data.count,
        mrr: data.revenue / 100 // Simplified MRR calculation
      }));

      setRevenueData(chartData);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    }
  };

  const fetchPlanBreakdown = async () => {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          subscription_plan:subscription_plans(name, display_name, price_monthly)
        `)
        .eq('status', 'active');

      if (error) throw error;

      // Calculate plan breakdown
      const planStats: { [key: string]: { count: number; revenue: number; name: string } } = {};
      
      data?.forEach(sub => {
        const plan = sub.subscription_plan as any;
        if (plan) {
          if (!planStats[plan.name]) {
            planStats[plan.name] = { count: 0, revenue: 0, name: plan.display_name };
          }
          planStats[plan.name].count += 1;
          planStats[plan.name].revenue += plan.price_monthly || 0;
        }
      });

      const totalRevenue = Object.values(planStats).reduce((sum, plan) => sum + plan.revenue, 0);
      
      const breakdown = Object.entries(planStats).map(([key, data]) => ({
        plan: data.name,
        revenue: data.revenue / 100,
        subscribers: data.count,
        percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
      }));

      setPlanBreakdown(breakdown);
    } catch (error) {
      console.error('Error fetching plan breakdown:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return <div className="p-6">Loading revenue analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Revenue Analytics</h2>
          <p className="text-muted-foreground">Track your subscription revenue and growth metrics</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.mrr)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +{metrics.growthRate}% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Recurring Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.arr)}</div>
            <div className="text-xs text-muted-foreground">
              Projected annual revenue
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeSubscriptions}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              {metrics.churnRate}% churn rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Success Rate</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.paymentSuccessRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">
              ARPU: {formatCurrency(metrics.averageRevenuePerUser)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>Monthly revenue and subscription growth</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  name === 'revenue' || name === 'mrr' ? formatCurrency(value) : value,
                  name === 'revenue' ? 'Revenue' : name === 'mrr' ? 'MRR' : 'Subscriptions'
                ]}
              />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
              <Line type="monotone" dataKey="mrr" stroke="hsl(var(--secondary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Plan Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Plan</CardTitle>
            <CardDescription>Distribution of revenue across subscription plans</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={planBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ plan, percentage }) => `${plan} (${percentage.toFixed(1)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {planBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan Performance</CardTitle>
            <CardDescription>Subscriber count and revenue by plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {planBreakdown.map((plan, index) => (
                <div key={plan.plan} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div>
                      <p className="font-medium">{plan.plan}</p>
                      <p className="text-sm text-muted-foreground">{plan.subscribers} subscribers</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(plan.revenue)}</p>
                    <Badge variant="outline">{plan.percentage.toFixed(1)}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};