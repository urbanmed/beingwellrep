import { List, Grid, Activity } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ViewMode = "list" | "card" | "timeline";

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  allowed?: ViewMode[];
}

export function ViewModeSelector({ viewMode, onViewModeChange, allowed }: ViewModeSelectorProps) {
  const allowedModes: ViewMode[] = allowed && allowed.length > 0 ? allowed : ["timeline", "card", "list"];
  const gridColsClass = allowedModes.length === 2 ? "grid-cols-2" : allowedModes.length === 1 ? "grid-cols-1" : "grid-cols-3";

  return (
    <Tabs value={viewMode} onValueChange={(value) => onViewModeChange(value as ViewMode)}>
      <TabsList className={`grid w-full ${gridColsClass}`}>
        {allowedModes.includes("timeline") && (
          <TabsTrigger value="timeline" className="flex items-center gap-2 text-xs">
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Timeline</span>
          </TabsTrigger>
        )}
        {allowedModes.includes("card") && (
          <TabsTrigger value="card" className="flex items-center gap-2 text-xs">
            <Grid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Grid</span>
          </TabsTrigger>
        )}
        {allowedModes.includes("list") && (
          <TabsTrigger value="list" className="flex items-center gap-2 text-xs">
            <List className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">List</span>
          </TabsTrigger>
        )}
      </TabsList>
    </Tabs>
  );
}