import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, User, Shield, Bell, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProfileBillingTab } from "@/components/billing/ProfileBillingTab";

export function AccountSettings() {
  const navigate = useNavigate();

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/profile")}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="medical-title">Account Settings</h1>
          <p className="medical-label">
            Manage your account preferences and billing
          </p>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-4">
        {/* Profile Settings */}
        <Card className="medical-card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="medical-subheading flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile Information
            </CardTitle>
            <CardDescription className="medical-label">
              Update your personal details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => navigate("/profile/edit")}
              className="w-full justify-start"
            >
              Edit Profile Details
            </Button>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card className="medical-card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="medical-subheading flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Privacy & Security
            </CardTitle>
            <CardDescription className="medical-label">
              Control your privacy settings and data sharing preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2">
                <span className="medical-body">Data sharing with physicians</span>
                <span className="medical-annotation">Enabled</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="medical-body">Anonymous analytics</span>
                <span className="medical-annotation">Disabled</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="medical-card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="medical-subheading flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notification Preferences
            </CardTitle>
            <CardDescription className="medical-label">
              Choose how you want to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2">
                <span className="medical-body">Email notifications</span>
                <span className="medical-annotation">Enabled</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="medical-body">Push notifications</span>
                <span className="medical-annotation">Enabled</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="medical-body">SMS notifications</span>
                <span className="medical-annotation">Disabled</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Section */}
        <Card className="medical-card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="medical-subheading flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Billing & Subscription
            </CardTitle>
            <CardDescription className="medical-label">
              Manage your subscription plan and billing information
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Include the existing billing functionality */}
        <ProfileBillingTab />
      </div>
    </div>
  );
}