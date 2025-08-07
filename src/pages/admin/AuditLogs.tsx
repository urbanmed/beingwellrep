import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, Filter } from 'lucide-react';

export default function AuditLogs() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            Track system activities and security events
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            System audit trail and security events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search audit logs..." className="flex-1" />
          </div>

          <div className="space-y-2">
            {[
              {
                timestamp: "2024-01-15 14:32:15",
                user: "admin@example.com",
                action: "User Login",
                resource: "Authentication System",
                ip: "192.168.1.100",
                status: "Success"
              },
              {
                timestamp: "2024-01-15 14:30:22",
                user: "john.doe@example.com",
                action: "Document Upload",
                resource: "Medical Reports",
                ip: "192.168.1.101",
                status: "Success"
              },
              {
                timestamp: "2024-01-15 14:28:45",
                user: "jane.smith@example.com",
                action: "Profile Update",
                resource: "User Profile",
                ip: "192.168.1.102",
                status: "Success"
              },
              {
                timestamp: "2024-01-15 14:25:33",
                user: "unknown",
                action: "Failed Login Attempt",
                resource: "Authentication System",
                ip: "203.0.113.1",
                status: "Failed"
              },
              {
                timestamp: "2024-01-15 14:20:18",
                user: "admin@example.com",
                action: "User Role Change",
                resource: "User Management",
                ip: "192.168.1.100",
                status: "Success"
              },
            ].map((log, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{log.action}</span>
                    <Badge variant={log.status === 'Success' ? 'default' : 'destructive'}>
                      {log.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {log.user} • {log.resource}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {log.timestamp} • IP: {log.ip}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}