import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Server, Cpu, HardDrive } from 'lucide-react';

export default function SystemHealth() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
        <p className="text-muted-foreground">
          Monitor system performance and infrastructure status
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Healthy</div>
            <p className="text-xs text-muted-foreground">
              99.9% uptime
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Server</CardTitle>
            <Server className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Online</div>
            <p className="text-xs text-muted-foreground">
              Response time: 145ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">67%</div>
            <p className="text-xs text-muted-foreground">
              +5% from last hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23%</div>
            <p className="text-xs text-muted-foreground">
              456GB used of 2TB
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Service Status</CardTitle>
            <CardDescription>
              Current status of all system services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Authentication Service", status: "Operational", uptime: "99.9%" },
                { name: "File Processing", status: "Operational", uptime: "99.7%" },
                { name: "AI Document Analysis", status: "Degraded", uptime: "98.2%" },
                { name: "Email Service", status: "Operational", uptime: "99.8%" },
                { name: "SMS Service", status: "Operational", uptime: "99.9%" },
              ].map((service, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="font-medium">{service.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">{service.uptime}</span>
                    <Badge variant={
                      service.status === 'Operational' ? 'default' :
                      service.status === 'Degraded' ? 'secondary' : 'destructive'
                    }>
                      {service.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>
              Key performance indicators over the last 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Memory Usage</span>
                  <span>4.2GB / 8GB</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '52.5%' }}></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Network I/O</span>
                  <span>234 MB/s</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '78%' }}></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Disk I/O</span>
                  <span>45 MB/s</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '35%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}