import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  Grid, 
  List, 
  LayoutGrid 
} from "lucide-react";

interface ViewModeSelectorProps {
  viewMode: 'timeline' | 'grid' | 'list' | 'card';
  onViewModeChange: (mode: 'timeline' | 'grid' | 'list' | 'card') => void;
}

export function ViewModeSelector({ viewMode, onViewModeChange }: ViewModeSelectorProps) {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium medical-label">View:</span>
      <Tabs value={viewMode} onValueChange={(value) => onViewModeChange(value as typeof viewMode)}>
        <TabsList className="grid grid-cols-4 w-auto">
          <TabsTrigger value="timeline" className="flex items-center space-x-1 px-3">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="grid" className="flex items-center space-x-1 px-3">
            <Grid className="h-4 w-4" />
            <span className="hidden sm:inline">Grid</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center space-x-1 px-3">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">List</span>
          </TabsTrigger>
          <TabsTrigger value="card" className="flex items-center space-x-1 px-3">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Card</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}