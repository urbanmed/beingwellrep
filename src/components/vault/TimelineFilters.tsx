import { useState, useEffect } from "react";
import { CalendarIcon, Filter, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TimelineFiltersProps {
  activeFilters: string[];
  onFilterChange: (filters: string[]) => void;
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  onClearAll: () => void;
}

const PRESET_FILTERS = [
  { id: "blood-tests-year", label: "Blood tests (past year)", type: "blood_test", days: 365 },
  { id: "recent-prescriptions", label: "Recent prescriptions", type: "prescription", days: 90 },
  { id: "imaging-year", label: "Imaging (past year)", type: "radiology", days: 365 },
  { id: "critical-reports", label: "Critical reports", type: "critical", days: null },
  { id: "processing-errors", label: "Processing errors", type: "failed", days: null },
  { id: "recent-month", label: "Last 30 days", type: "recent", days: 30 },
];

export function TimelineFilters({
  activeFilters,
  onFilterChange,
  dateRange,
  onDateRangeChange,
  onClearAll
}: TimelineFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempActiveFilters, setTempActiveFilters] = useState(activeFilters);
  const [tempDateRange, setTempDateRange] = useState(dateRange);

  const toggleFilter = (filterId: string) => {
    if (tempActiveFilters.includes(filterId)) {
      setTempActiveFilters(tempActiveFilters.filter(f => f !== filterId));
    } else {
      setTempActiveFilters([...tempActiveFilters, filterId]);
    }
  };

  const applyFilters = () => {
    onFilterChange(tempActiveFilters);
    onDateRangeChange(tempDateRange);
    setIsOpen(false);
  };

  const clearAll = () => {
    setTempActiveFilters([]);
    setTempDateRange({ start: null, end: null });
    onFilterChange([]);
    onDateRangeChange({ start: null, end: null });
    onClearAll();
    setIsOpen(false);
  };

  const clearDateRange = () => {
    setTempDateRange({ start: null, end: null });
  };

  // Update temp state when props change (for external updates)
  useEffect(() => {
    setTempActiveFilters(activeFilters);
  }, [activeFilters]);

  useEffect(() => {
    setTempDateRange(dateRange);
  }, [dateRange]);

  const hasActiveFilters = activeFilters.length > 0 || dateRange.start || dateRange.end;
  const totalActiveCount = activeFilters.length + (dateRange.start || dateRange.end ? 1 : 0);

  // Generate button text
  const getButtonText = () => {
    if (!hasActiveFilters) return "Filters";
    
    if (totalActiveCount === 1) {
      if (activeFilters.length === 1) {
        const filter = PRESET_FILTERS.find(f => f.id === activeFilters[0]);
        return filter ? filter.label : "1 filter";
      } else {
        return "Date range";
      }
    }

    // Multiple filters - show count
    return `${totalActiveCount} filters active`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={hasActiveFilters ? "default" : "outline"}
          size="sm"
          className="h-8"
        >
          <Filter className="h-3 w-3 mr-1" />
          {getButtonText()}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4 space-y-4">
          {/* Preset Filters */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Filter Options</h4>
            <div className="space-y-2">
              {PRESET_FILTERS.map((filter) => (
                <div key={filter.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={filter.id}
                    checked={tempActiveFilters.includes(filter.id)}
                    onCheckedChange={() => toggleFilter(filter.id)}
                  />
                  <label
                    htmlFor={filter.id}
                    className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {filter.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Date Range */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Date Range</h4>
              {(tempDateRange.start || tempDateRange.end) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDateRange}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">From</label>
                <Calendar
                  mode="single"
                  selected={tempDateRange.start || undefined}
                  onSelect={(date) => setTempDateRange(prev => ({ ...prev, start: date || null }))}
                  className="pointer-events-auto scale-90 -mx-4"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">To</label>
                <Calendar
                  mode="single"
                  selected={tempDateRange.end || undefined}
                  onSelect={(date) => setTempDateRange(prev => ({ ...prev, end: date || null }))}
                  className="pointer-events-auto scale-90 -mx-4"
                />
              </div>
            </div>
            {(tempDateRange.start || tempDateRange.end) && (
              <div className="text-xs text-muted-foreground">
                {tempDateRange.start && tempDateRange.end
                  ? `${format(tempDateRange.start, "MMM d, yyyy")} - ${format(tempDateRange.end, "MMM d, yyyy")}`
                  : tempDateRange.start
                  ? `From ${format(tempDateRange.start, "MMM d, yyyy")}`
                  : `Until ${format(tempDateRange.end!, "MMM d, yyyy")}`}
              </div>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button size="sm" onClick={applyFilters} className="flex-1">
              Apply
            </Button>
            <Button variant="outline" size="sm" onClick={clearAll} className="flex-1">
              Clear All
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}