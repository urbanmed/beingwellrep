import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Download, Filter } from 'lucide-react';
import { useAuditLogs } from '@/hooks/useAuditLogs';

export default function AuditLogs() {
  const { 
    logs, 
    loading, 
    searchTerm, 
    setSearchTerm, 
    actionFilter, 
    setActionFilter, 
    exportLogs 
  } = useAuditLogs();

  if (loading) {
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
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              System audit trail and security events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2 mb-1" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="user_role_change">Role Changes</SelectItem>
              <SelectItem value="user_login">User Login</SelectItem>
              <SelectItem value="content_create">Content Created</SelectItem>
              <SelectItem value="content_update">Content Updated</SelectItem>
              <SelectItem value="settings_update">Settings Updated</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportLogs}>
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
            <Input 
              placeholder="Search audit logs..." 
              className="flex-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            {logs && logs.length > 0 ? (
              logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{log.action}</span>
                      <Badge variant="default">Success</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Admin: {log.admin_user_id.slice(0, 8)} • {log.target_type}
                      {log.target_id && ` • Target: ${log.target_id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()} 
                      {log.ip_address && ` • IP: ${log.ip_address}`}
                    </p>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Details: {JSON.stringify(log.details, null, 2).slice(0, 100)}...
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No audit logs found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}