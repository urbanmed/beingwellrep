import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, Activity, AlertTriangle, BarChart3, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface DashboardStats {
  totalUsers: number;
  totalReports: number;
  activeSosAlerts: number;
  systemStatus: 'healthy' | 'warning' | 'critical';
  recentActivity: Array<{
    id: string;
    action: string;
    timestamp: string;
    user: string;
  }>;
}

export default function AdminDashboard() {
  const { userRole } = useAdminAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalReports: 0,
    activeSosAlerts: 0,
    systemStatus: 'healthy',
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);

        // Get total users count (only admins can see this)
        let totalUsers = 0;
        if (userRole === 'admin' || userRole === 'super_admin') {
          const { count: userCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
          totalUsers = userCount || 0;
        }

        // Get total reports count
        const { count: reportCount } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true });

        // Get active SOS alerts
        const { count: sosCount } = await supabase
          .from('sos_activations')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'triggered');

        // Get recent activity from audit logs (only admins can see this)
        let recentActivity: any[] = [];
        if (userRole === 'admin' || userRole === 'super_admin') {
          const { data: auditData } = await supabase
            .from('admin_audit_logs')
            .select(`
              id,
              action,
              created_at,
              admin_user_id,
              details
            `)
            .order('created_at', { ascending: false })
            .limit(5);

          recentActivity = auditData?.map(audit => ({
            id: audit.id,
            action: audit.action,
            timestamp: audit.created_at,
            user: audit.admin_user_id
          })) || [];
        }

        setStats({
          totalUsers,
          totalReports: reportCount || 0,
          activeSosAlerts: sosCount || 0,
          systemStatus: (sosCount || 0) > 5 ? 'warning' : 'healthy',
          recentActivity
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userRole) {
      fetchDashboardStats();
    }
  }, [userRole]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-muted animate-pulse rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard Overview</h2>
        <p className="text-muted-foreground">
          Welcome to the admin panel. Here's what's happening in your system.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(userRole === 'admin' || userRole === 'super_admin') && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Registered users
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medical Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReports}</div>
            <p className="text-xs text-muted-foreground">
              Documents processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active SOS Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.activeSosAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(stats.systemStatus)}`}></div>
              <span className="text-sm font-medium capitalize">{stats.systemStatus}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              All services operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {(userRole === 'admin' || userRole === 'super_admin') && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Admin Activity</CardTitle>
            <CardDescription>
              Latest administrative actions performed in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentActivity.length > 0 ? (
              <div className="space-y-2">
                {stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">
                        by {activity.user} • {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline">
                      <Activity className="w-3 h-3 mr-1" />
                      Action
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity to display.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
              <BarChart3 className="h-6 w-6 mb-2 text-primary" />
              <h3 className="font-medium">View Analytics</h3>
              <p className="text-sm text-muted-foreground">System usage and performance metrics</p>
            </div>
            
            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
              <AlertTriangle className="h-6 w-6 mb-2 text-orange-500" />
              <h3 className="font-medium">Monitor SOS</h3>
              <p className="text-sm text-muted-foreground">Check active emergency alerts</p>
            </div>
            
            {(userRole === 'admin' || userRole === 'super_admin') && (
              <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <Users className="h-6 w-6 mb-2 text-blue-500" />
                <h3 className="font-medium">Manage Users</h3>
                <p className="text-sm text-muted-foreground">User accounts and permissions</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}