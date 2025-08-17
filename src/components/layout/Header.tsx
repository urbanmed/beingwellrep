import { useNavigate, Link } from "react-router-dom";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { Crown, Sparkles } from "lucide-react";

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

  const firstName = profile?.first_name;
  const greeting = getTimeBasedGreeting();
  const greetingText = firstName ? `${greeting}, ${firstName} 👋` : `${greeting} 👋`;

  const initials =
    (profile?.first_name || profile?.last_name)
      ? `${(profile?.first_name?.[0] ?? "").toUpperCase()}${(profile?.last_name?.[0] ?? "").toUpperCase()}` || "U"
      : (user?.email ? user.email.slice(0, 2).toUpperCase() : "U");

  const currentPlan = getCurrentPlan();
  const isFreePlan = currentPlan?.name === 'free';
  const showUpgradeButton = user && isFreePlan;

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50 pt-safe">
      <div className="flex items-center justify-center px-3 sm:px-4 py-6 sm:py-4 mt-10 sm:mt-8">
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
          <h2 className="text-base sm:text-lg font-medium text-foreground truncate mr-2">{greetingText}</h2>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {showUpgradeButton && (
              <Button
                size="sm"
                onClick={() => navigate("/pricing")}
                className="h-7 px-2 sm:h-8 sm:px-3 text-xs bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-sm"
              >
                <Crown className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Upgrade</span>
                <span className="sm:hidden">Pro</span>
              </Button>
            )}
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