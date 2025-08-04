import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <h1 className="text-xl font-semibold">Health Buddy</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.user_metadata?.first_name || user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container py-8">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-foreground mb-4">Welcome to Health Buddy</h2>
          <p className="text-lg text-muted-foreground mb-8">Your personal health companion</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="p-6 rounded-lg border bg-card">
              <h3 className="text-xl font-semibold mb-2">Medical Reports</h3>
              <p className="text-muted-foreground">Upload and manage your medical documents</p>
            </div>
            
            <div className="p-6 rounded-lg border bg-card">
              <h3 className="text-xl font-semibold mb-2">AI Summaries</h3>
              <p className="text-muted-foreground">Get intelligent summaries of your health data</p>
            </div>
            
            <div className="p-6 rounded-lg border bg-card">
              <h3 className="text-xl font-semibold mb-2">Health Analytics</h3>
              <p className="text-muted-foreground">Track and analyze your health trends</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
