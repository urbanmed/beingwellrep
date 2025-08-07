import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function SosMonitoring() {
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
            <div className="text-2xl font-bold text-destructive">3</div>
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
            <div className="text-2xl font-bold">2.3m</div>
            <p className="text-xs text-muted-foreground">
              -30s from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              +2 from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">False Alarms</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">
              -2 from last week
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
            {[
              { 
                id: "SOS001", 
                user: "John Doe", 
                location: "Downtown Medical Center", 
                time: "2 min ago", 
                severity: "High",
                status: "Active"
              },
              { 
                id: "SOS002", 
                user: "Jane Smith", 
                location: "Home", 
                time: "15 min ago", 
                severity: "Medium",
                status: "Responding"
              },
              { 
                id: "SOS003", 
                user: "Bob Johnson", 
                location: "Work Office", 
                time: "1 hour ago", 
                severity: "Low",
                status: "Investigating"
              },
            ].map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg bg-red-50">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium">{alert.id}</h3>
                    <Badge variant={
                      alert.severity === 'High' ? 'destructive' :
                      alert.severity === 'Medium' ? 'secondary' : 'outline'
                    }>
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-sm">{alert.user} - {alert.location}</p>
                  <p className="text-xs text-muted-foreground">{alert.time}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{alert.status}</Badge>
                  <Button size="sm">Respond</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}