import { useState } from "react";
import { CalendarIcon, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [showFilters, setShowFilters] = useState(false);
  const [tempDateRange, setTempDateRange] = useState(dateRange);

  const toggleFilter = (filterId: string) => {
    if (activeFilters.includes(filterId)) {
      onFilterChange(activeFilters.filter(f => f !== filterId));
    } else {
      onFilterChange([...activeFilters, filterId]);
    }
  };

  const applyDateRange = () => {
    onDateRangeChange(tempDateRange);
  };

  const clearDateRange = () => {
    const clearedRange = { start: null, end: null };
    setTempDateRange(clearedRange);
    onDateRangeChange(clearedRange);
  };

  const clearAllFilters = () => {
    onClearAll();
    setTempDateRange({ start: null, end: null });
    setShowFilters(false);
  };

  const hasActiveFilters = activeFilters.length > 0 || dateRange.start || dateRange.end;

  return (
    <Popover open={showFilters} onOpenChange={setShowFilters}>
      <PopoverTrigger asChild>
        <Button
          variant={hasActiveFilters ? "default" : "outline"}
          size="sm"
          className="h-9"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 text-xs bg-background/20 px-1.5 py-0.5 rounded-full">
              {activeFilters.length + (dateRange.start || dateRange.end ? 1 : 0)}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4 space-y-4">
          {/* Preset Filters */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Filter by Type</h4>
            <div className="space-y-2">
              {PRESET_FILTERS.map((filter) => (
                <div key={filter.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={filter.id}
                    checked={activeFilters.includes(filter.id)}
                    onCheckedChange={() => toggleFilter(filter.id)}
                  />
                  <label
                    htmlFor={filter.id}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {filter.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Date Range */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Date Range</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">From</label>
                <Calendar
                  mode="single"
                  selected={tempDateRange.start || undefined}
                  onSelect={(date) => {
                    setTempDateRange(prev => ({ ...prev, start: date || null }));
                    applyDateRange();
                  }}
                  className="pointer-events-auto w-full"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">To</label>
                <Calendar
                  mode="single"
                  selected={tempDateRange.end || undefined}
                  onSelect={(date) => {
                    setTempDateRange(prev => ({ ...prev, end: date || null }));
                    applyDateRange();
                  }}
                  className="pointer-events-auto w-full"
                />
              </div>
              {(dateRange.start || dateRange.end) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearDateRange}
                  className="w-full"
                >
                  Clear Date Range
                </Button>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <>
              <Separator />
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Clear All Filters
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}