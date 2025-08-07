import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useSosMonitoring } from '@/hooks/useSosMonitoring';

export default function SosMonitoring() {
  const { alerts, stats, loading, respondToAlert } = useSosMonitoring();

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SOS Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor emergency alerts and response times
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
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
        <h1 className="text-3xl font-bold tracking-tight">SOS Monitoring</h1>
        <p className="text-muted-foreground">
          Monitor emergency alerts and response times
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats?.activeAlerts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.averageResponseTime || 0}m</div>
            <p className="text-xs text-muted-foreground">
              Average response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.resolvedToday || 0}</div>
            <p className="text-xs text-muted-foreground">
              Successfully handled today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">False Alarms</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.falseAlarms || 0}</div>
            <p className="text-xs text-muted-foreground">
              Cancelled alerts
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active SOS Alerts</CardTitle>
          <CardDescription>
            Current emergency situations requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts && alerts.filter(alert => alert.status === 'triggered').length > 0 ? (
              alerts.filter(alert => alert.status === 'triggered').map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg bg-red-50">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">SOS{alert.id.slice(-3)}</h3>
                      <Badge variant="destructive">High</Badge>
                    </div>
                    <p className="text-sm">
                      {alert.profile?.first_name} {alert.profile?.last_name} - {alert.location_data?.address || 'Location not available'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(alert.triggered_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">Active</Badge>
                    <Button size="sm" onClick={() => respondToAlert(alert.id)}>
                      Respond
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active SOS alerts</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* All Recent Alerts */}
      {alerts && alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent SOS Alerts</CardTitle>
            <CardDescription>
              All recent emergency alerts and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alerts.slice(0, 10).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">SOS{alert.id.slice(-3)}</h3>
                      <Badge variant={
                        alert.status === 'triggered' ? 'destructive' :
                        alert.status === 'responding' ? 'default' : 'secondary'
                      }>
                        {alert.status === 'triggered' ? 'High' : 'Medium'}
                      </Badge>
                    </div>
                    <p className="text-sm">
                      {alert.profile?.first_name} {alert.profile?.last_name} - {alert.location_data?.address || 'Location not available'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(alert.triggered_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                    </Badge>
                    {alert.cancelled_at && (
                      <Badge variant="outline">Cancelled</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}