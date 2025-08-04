import { NavLink, useLocation } from "react-router-dom";
import { Home, Upload, User, Brain, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Upload, label: "Upload", path: "/upload" },
  { icon: Clock, label: "Timeline", path: "/timeline" },
  { icon: Brain, label: "Summaries", path: "/summaries" },
  { icon: User, label: "Profile", path: "/profile" },
];

export function BottomNavigation() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <div className="flex justify-around items-center h-16 px-4">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          
          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 rounded-lg transition-colors",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium truncate">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}