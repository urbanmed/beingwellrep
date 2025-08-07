import { List, Grid, Activity } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ViewMode = "list" | "card" | "timeline";

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewModeSelector({ viewMode, onViewModeChange }: ViewModeSelectorProps) {
  return (
    <Tabs value={viewMode} onValueChange={(value) => onViewModeChange(value as ViewMode)}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="timeline" className="flex items-center gap-2 text-xs">
          <Activity className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Timeline</span>
        </TabsTrigger>
        <TabsTrigger value="card" className="flex items-center gap-2 text-xs">
          <Grid className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Grid</span>
        </TabsTrigger>
        <TabsTrigger value="list" className="flex items-center gap-2 text-xs">
          <List className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">List</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}