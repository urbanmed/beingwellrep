import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, FileText, Activity, LogOut, User, Phone, Mail, Edit, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ProfileCompletionBanner } from "@/components/profile/ProfileCompletionBanner";
import { FamilySection } from "@/components/profile/FamilySection";
import { DocumentProcessing } from "@/components/profile/DocumentProcessing";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";

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
          setAvatarUrl(data.avatar_url);
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

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">My Profile</TabsTrigger>
          <TabsTrigger value="family">Family Members</TabsTrigger>
          <TabsTrigger value="processing">Processing Status</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt="Profile photo" />
                  ) : (
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {user?.email ? getInitials(user.email) : <User className="h-8 w-8" />}
                    </AvatarFallback>
                  )}
                </Avatar>
                 <div className="flex-1">
                   <h2 className="medical-heading">
                     {user?.email?.split('@')[0] || 'User'}
                   </h2>
                  <div className="space-y-1 text-sm text-muted-foreground">
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
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
             <Card>
               <CardHeader className="pb-2">
                 <CardTitle className="medical-heading flex items-center">
                   <FileText className="h-5 w-5 mr-2 text-primary" />
                   Documents
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="medical-title">0</div>
                 <p className="medical-label">Uploaded files</p>
               </CardContent>
             </Card>

             <Card>
               <CardHeader className="pb-2">
                 <CardTitle className="medical-heading flex items-center">
                   <Activity className="h-5 w-5 mr-2 text-primary" />
                   Reports
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="medical-title">0</div>
                 <p className="medical-label">AI analyses</p>
               </CardContent>
             </Card>

             <Card>
               <CardHeader className="pb-2">
                 <CardTitle className="medical-heading flex items-center">
                   <Users className="h-5 w-5 mr-2 text-primary" />
                   Family
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="medical-title">{familyMembers.length}</div>
                 <p className="medical-label">Members</p>
               </CardContent>
             </Card>
          </div>

          {/* Menu Options */}
          <div className="space-y-2">
             <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
               <CardHeader className="py-4">
                 <CardTitle className="medical-subheading flex items-center justify-between">
                   <div className="flex items-center">
                     <Settings className="h-5 w-5 mr-3 text-primary" />
                     Account Settings
                   </div>
                   <span className="text-muted-foreground">→</span>
                 </CardTitle>
               </CardHeader>
             </Card>

             <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
               <CardHeader className="py-4">
                 <CardTitle className="medical-subheading flex items-center justify-between">
                   <div className="flex items-center">
                     <FileText className="h-5 w-5 mr-3 text-primary" />
                     My Documents
                   </div>
                   <span className="text-muted-foreground">→</span>
                 </CardTitle>
               </CardHeader>
             </Card>

             <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
               <CardHeader className="py-4">
                 <CardTitle className="medical-subheading flex items-center justify-between">
                   <div className="flex items-center">
                     <Activity className="h-5 w-5 mr-3 text-primary" />
                     Health Analytics
                   </div>
                   <span className="text-muted-foreground">→</span>
                 </CardTitle>
               </CardHeader>
             </Card>
          </div>

          {/* Sign Out */}
          <Card>
            <CardContent className="pt-6">
              <Button 
                variant="destructive" 
                onClick={handleSignOut}
                className="w-full"
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

        <TabsContent value="processing">
          <DocumentProcessing />
        </TabsContent>
      </Tabs>
    </div>
  );
}