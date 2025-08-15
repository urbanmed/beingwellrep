import { NavLink, useLocation } from "react-router-dom";
import { Home, Headphones, FolderOpen, Brain, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: FolderOpen, label: "Vault", path: "/vault" },
  { icon: Brain, label: "Insights", path: "/summaries" },
  { icon: Headphones, label: "Concierge", path: "/concierge" },
];

const centerItem = { icon: Bot, label: "AI Assistant", path: "/ai-assistant" };

export function BottomNavigation() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border medical-card-shadow z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="relative flex items-center h-14 sm:h-16 px-3 sm:px-4">
        {/* Left side navigation items */}
        <div className="flex flex-1 justify-around">
          {navItems.slice(0, 2).map(({ icon: Icon, label, path }) => {
            const isActive = location.pathname === path;
            
            return (
              <NavLink
                key={path}
                to={path}
                className={cn(
                  "flex flex-col items-center justify-center py-1.5 sm:py-2 px-0.5 sm:px-1 rounded-lg transition-colors min-h-[44px] touch-target",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5 mb-0.5 sm:mb-1" />
                <span className="text-[10px] sm:text-xs font-medium truncate">{label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Center AI Assistant button */}
        <div className="flex justify-center px-2 sm:px-4">
          <NavLink
            to={centerItem.path}
            aria-label={centerItem.label}
            className={cn(
              "relative overflow-hidden flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-ring touch-target active:scale-95",
              location.pathname === centerItem.path
                ? "bg-gradient-to-br from-primary to-primary text-primary-foreground shadow-lg ring-2 ring-primary/40 scale-105 sm:scale-110"
                : "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground hover:scale-105 shadow-md"
            )}
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-primary-foreground/20 to-transparent" />
            <centerItem.icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </NavLink>
        </div>

        {/* Right side navigation items */}
        <div className="flex flex-1 justify-around">
          {navItems.slice(2).map(({ icon: Icon, label, path }) => {
            const isActive = location.pathname === path;
            
            return (
              <NavLink
                key={path}
                to={path}
                className={cn(
                  "flex flex-col items-center justify-center py-1.5 sm:py-2 px-0.5 sm:px-1 rounded-lg transition-colors min-h-[44px] touch-target",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5 mb-0.5 sm:mb-1" />
                <span className="text-[10px] sm:text-xs font-medium truncate">{label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}