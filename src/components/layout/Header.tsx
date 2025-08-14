import { useNavigate, Link } from "react-router-dom";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { FamilyMemberSelector } from "@/components/family/FamilyMemberSelector";
import { useFamilyMemberContext } from "@/contexts/FamilyMemberContext";

export function Header() {
  const navigate = useNavigate();
  const { profile, loading } = useUserProfile();
  const { user } = useAuth();
  const { selectedMember, selectedMemberId, setSelectedMemberId, familyMembers } = useFamilyMemberContext();

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const displayName = selectedMember 
    ? selectedMember.first_name 
    : profile?.first_name;
  const greeting = getTimeBasedGreeting();
  const greetingText = displayName ? `${greeting}, ${displayName} 👋` : `${greeting} 👋`;

  const initials =
    (profile?.first_name || profile?.last_name)
      ? `${(profile?.first_name?.[0] ?? "").toUpperCase()}${(profile?.last_name?.[0] ?? "").toUpperCase()}` || "U"
      : (user?.email ? user.email.slice(0, 2).toUpperCase() : "U");

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center justify-center px-4 py-3">
        <div 
          className="cursor-pointer"
          onClick={() => navigate("/")}
        >
          <img 
            src="/lovable-uploads/6e18c5f3-d6d2-4a2b-865a-590ab23d865a.png" 
            alt="beingwell" 
            className="h-8 w-auto object-contain"
            style={{ imageRendering: 'crisp-edges' }}
          />
        </div>
      </div>
      {!loading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-sm font-medium text-foreground">{greetingText}</h2>
            <div className="flex items-center gap-3">
              <NotificationCenter />
              <Link to="/profile" aria-label="Go to profile" className="shrink-0">
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </div>
          <div className="px-4 pb-2">
            <FamilyMemberSelector
              familyMembers={familyMembers}
              selectedMemberId={selectedMemberId || "self"}
              onValueChange={(value) => setSelectedMemberId(value === "self" ? null : value)}
              placeholder="Select profile"
              allowSelf={true}
              userDisplayName="Myself"
            />
          </div>
        </div>
      )}
    </header>
  );
}