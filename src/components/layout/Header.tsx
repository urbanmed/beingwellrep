import { useNavigate, Link } from "react-router-dom";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import NotificationCenter from "@/components/notifications/NotificationCenter";

export function Header() {
  const navigate = useNavigate();
  const { profile, loading } = useUserProfile();
  const { user } = useAuth();

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

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50 pt-safe">
      <div className="flex items-center justify-center px-3 sm:px-4 py-2.5 sm:py-3">
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
          <h2 className="text-xs sm:text-sm font-medium text-foreground truncate mr-2">{greetingText}</h2>
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