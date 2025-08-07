import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, Shield, Bell, Database } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure system-wide settings and preferences
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Security Settings</CardTitle>
            </div>
            <CardDescription>
              Configure security policies and authentication settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="two-factor">Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Require 2FA for all admin accounts
                </p>
              </div>
              <Switch id="two-factor" defaultChecked />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="session-timeout">Auto Session Timeout</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically log out inactive users
                </p>
              </div>
              <Switch id="session-timeout" defaultChecked />
            </div>

            <div className="space-y-2">
              <Label htmlFor="session-duration">Session Duration (minutes)</Label>
              <Input id="session-duration" type="number" defaultValue="30" className="w-32" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notification Settings</CardTitle>
            </div>
            <CardDescription>
              Configure system notifications and alerts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-alerts">Email Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Send email notifications for critical events
                </p>
              </div>
              <Switch id="email-alerts" defaultChecked />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sms-alerts">SMS Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Send SMS for emergency situations
                </p>
              </div>
              <Switch id="sms-alerts" defaultChecked />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin Email</Label>
              <Input id="admin-email" type="email" defaultValue="admin@example.com" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <CardTitle>Data Management</CardTitle>
            </div>
            <CardDescription>
              Configure data retention and backup policies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-backup">Automatic Backups</Label>
                <p className="text-sm text-muted-foreground">
                  Enable daily automated backups
                </p>
              </div>
              <Switch id="auto-backup" defaultChecked />
            </div>

            <div className="space-y-2">
              <Label htmlFor="retention-period">Data Retention Period (days)</Label>
              <Input id="retention-period" type="number" defaultValue="2555" className="w-32" />
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-medium">Backup Actions</h3>
              <div className="flex space-x-2">
                <Button variant="outline">Create Backup</Button>
                <Button variant="outline">Restore from Backup</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <SettingsIcon className="h-5 w-5" />
              <CardTitle>System Configuration</CardTitle>
            </div>
            <CardDescription>
              General system settings and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="app-name">Application Name</Label>
              <Input id="app-name" defaultValue="Medical Records Platform" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-file-size">Max File Size (MB)</Label>
              <Input id="max-file-size" type="number" defaultValue="50" className="w-32" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Enable maintenance mode for system updates
                </p>
              </div>
              <Switch id="maintenance-mode" />
            </div>

            <Separator />

            <Button className="w-full">Save Settings</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}