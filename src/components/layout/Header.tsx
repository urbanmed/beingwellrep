import { useNavigate, Link } from "react-router-dom";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { Crown, Sparkles, Zap } from "lucide-react";

export function Header() {
  const navigate = useNavigate();
  const { profile, loading } = useUserProfile();
  const { user } = useAuth();
  const { getCurrentPlan, isSubscriptionActive } = useSubscription();

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'basic': return <Sparkles className="h-4 w-4 text-muted-foreground ml-1" />;
      case 'premium': return <Zap className="h-4 w-4 text-primary ml-1" />;
      case 'enterprise': return <Crown className="h-4 w-4 text-amber-500 ml-1" />;
      default: return null;
    }
  };

  const firstName = profile?.first_name;
  const greeting = getTimeBasedGreeting();
  const baseGreeting = firstName ? `${greeting}, ${firstName} 👋` : `${greeting} 👋`;
  
  const currentPlan = getCurrentPlan();
  const planIcon = currentPlan?.name !== 'free' ? getPlanIcon(currentPlan?.name || '') : null;

  const initials =
    (profile?.first_name || profile?.last_name)
      ? `${(profile?.first_name?.[0] ?? "").toUpperCase()}${(profile?.last_name?.[0] ?? "").toUpperCase()}` || "U"
      : (user?.email ? user.email.slice(0, 2).toUpperCase() : "U");


  return (
    <header className="bg-background border-b border-border">
      <div className="flex items-center justify-center px-3 sm:px-4 py-3 sm:py-2">
        <div 
          className="cursor-pointer touch-target active:scale-95 transition-transform"
          onClick={() => navigate("/")}
        >
          <img 
            src="/lovable-uploads/6e18c5f3-d6d2-4a2b-865a-590ab23d865a.png" 
            alt="beingwell" 
            className="h-7 sm:h-8 w-auto object-contain"
            style={{ imageRendering: 'crisp-edges' }}
          />
        </div>
      </div>
      {!loading && (
        <div className="flex items-center justify-between px-3 sm:px-4 pb-2">
          <div className="flex items-center truncate mr-2">
            <h2 className="text-base sm:text-lg font-medium text-foreground">{baseGreeting}</h2>
            {planIcon}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <NotificationCenter />
            <Link to="/profile" aria-label="Go to profile" className="shrink-0 touch-target">
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border border-border">
                <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}