import { useUserProfile } from "@/hooks/useUserProfile";

export function PersonalizedGreeting() {
  const { profile, loading } = useUserProfile();

  if (loading) {
    return null;
  }

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const firstName = profile?.first_name;
  const greeting = getTimeBasedGreeting();

  return (
    <div className="px-4 py-2">
      <h1 className="text-xl font-medium text-foreground">
        {firstName ? `${greeting}, ${firstName} 👋` : `${greeting} 👋`}
      </h1>
    </div>
  );
}