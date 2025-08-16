import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, FileText, Activity, LogOut, User, Phone, Mail, Edit, Users, AlertTriangle, CreditCard, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ProfileCompletionBanner } from "@/components/profile/ProfileCompletionBanner";
import { FamilySection } from "@/components/profile/FamilySection";
import { EmergencyContactsSection } from "@/components/profile/EmergencyContactsSection";
import { ProfileBillingTab } from "@/components/billing/ProfileBillingTab";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";
import { getSignedUrl } from "@/lib/storage";

export default function Profile() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { familyMembers } = useFamilyMembers();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("user_id", user.id)
          .single();

        if (data?.avatar_url) {
          const signed = await getSignedUrl({ fileUrl: data.avatar_url });
          setAvatarUrl(signed?.url || null);
        } else {
          setAvatarUrl(null);
        }
      } catch (error) {
        // Silently handle error - profile might not exist yet
      }
    };

    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
    } catch (error) {
      toast({
        title: "Sign out failed",
        description: "An error occurred while signing out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="p-4 space-y-6">
      {/* Profile Completion Banner */}
      <ProfileCompletionBanner />
      <h1 className="sr-only">Profile</h1>
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 rounded-full h-10 p-1">
          <TabsTrigger value="profile" className="rounded-full h-8 px-2 text-xs shadow-none">Profile</TabsTrigger>
          <TabsTrigger value="family" className="rounded-full h-8 px-2 text-xs shadow-none">Family</TabsTrigger>
          <TabsTrigger value="emergency" className="rounded-full h-8 px-2 text-xs shadow-none">Emergency</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt="Profile photo" />
                  ) : (
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {user?.email ? getInitials(user.email) : <User className="h-6 w-6" />}
                    </AvatarFallback>
                  )}
                </Avatar>
                 <div className="flex-1">
                   <h2 className="medical-heading-sm">
                     {user?.email?.split('@')[0] || 'User'}
                   </h2>
                  <div className="space-y-0.5 medical-label-xs text-muted-foreground">
                    {user?.email && (
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        {user.email}
                      </div>
                    )}
                    {user?.phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2" />
                        {user.phone}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/profile/edit")}
                  className="rounded-full h-8 px-3 text-xs shadow-none"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>

           {/* Quick Stats */}
           <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <Card>
                <CardContent className="p-2">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-foreground">0</div>
                      <p className="text-xs text-muted-foreground">Documents</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-2">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-foreground">0</div>
                      <p className="text-xs text-muted-foreground">Reports</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-2">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-foreground">{familyMembers.length}</div>
                      <p className="text-xs text-muted-foreground">Family Members</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
           </div>

          {/* Menu Options */}
          <div className="space-y-2">
             <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate("/profile/settings")}>
               <CardHeader className="py-3">
                 <CardTitle className="medical-subheading flex items-center justify-between">
                   <div className="flex items-center">
                     <Settings className="h-5 w-5 mr-3 text-primary" />
                     Account Settings
                   </div>
                   <span className="text-muted-foreground">→</span>
                 </CardTitle>
               </CardHeader>
             </Card>

              <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate("/vault")}>
                <CardHeader className="py-3">
                  <CardTitle className="medical-subheading flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 mr-3 text-primary" />
                      My Documents
                    </div>
                    <span className="text-muted-foreground">→</span>
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate("/summaries")}>
                <CardHeader className="py-3">
                  <CardTitle className="medical-subheading flex items-center justify-between">
                    <div className="flex items-center">
                      <Activity className="h-5 w-5 mr-3 text-primary" />
                      Health Analytics
                    </div>
                    <span className="text-muted-foreground">→</span>
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate("/pricing")}>
                <CardHeader className="py-3">
                  <CardTitle className="medical-subheading flex items-center justify-between">
                    <div className="flex items-center">
                      <Crown className="h-5 w-5 mr-3 text-primary" />
                      Upgrade Plan
                    </div>
                    <span className="text-muted-foreground">→</span>
                  </CardTitle>
                </CardHeader>
              </Card>
          </div>

          {/* Sign Out */}
          <Card>
            <CardContent className="p-4">
              <Button 
                variant="destructive" 
                onClick={handleSignOut}
                className="w-full rounded-full h-9 shadow-none"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="family">
          <FamilySection />
        </TabsContent>

        <TabsContent value="emergency">
          <EmergencyContactsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}