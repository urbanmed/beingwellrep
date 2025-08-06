import { useState } from "react";
import { CalendarIcon, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const [showDatePicker, setShowDatePicker] = useState(false);
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
    setShowDatePicker(false);
  };

  const clearDateRange = () => {
    const clearedRange = { start: null, end: null };
    setTempDateRange(clearedRange);
    onDateRangeChange(clearedRange);
    setShowDatePicker(false);
  };

  const hasActiveFilters = activeFilters.length > 0 || dateRange.start || dateRange.end;

  return (
    <div className="space-y-4">
      {/* Preset Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {PRESET_FILTERS.map((filter) => (
          <Button
            key={filter.id}
            variant={activeFilters.includes(filter.id) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleFilter(filter.id)}
            className="h-8"
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Date Range Picker and Clear */}
      <div className="flex items-center gap-3">
        <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
          <PopoverTrigger asChild>
            <Button
              variant={dateRange.start || dateRange.end ? "default" : "outline"}
              size="sm"
              className="h-8"
            >
              <CalendarIcon className="h-3 w-3 mr-1" />
              {dateRange.start && dateRange.end
                ? `${format(dateRange.start, "MMM d")} - ${format(dateRange.end, "MMM d")}`
                : dateRange.start
                ? `From ${format(dateRange.start, "MMM d")}`
                : dateRange.end
                ? `Until ${format(dateRange.end, "MMM d")}`
                : "Date Range"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Select Date Range</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">From</label>
                    <Calendar
                      mode="single"
                      selected={tempDateRange.start || undefined}
                      onSelect={(date) => setTempDateRange(prev => ({ ...prev, start: date || null }))}
                      className="pointer-events-auto"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">To</label>
                    <Calendar
                      mode="single"
                      selected={tempDateRange.end || undefined}
                      onSelect={(date) => setTempDateRange(prev => ({ ...prev, end: date || null }))}
                      className="pointer-events-auto"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={applyDateRange}>Apply</Button>
                <Button variant="outline" size="sm" onClick={clearDateRange}>Clear</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-8 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Active Filter Badges */}
      {(activeFilters.length > 0 || dateRange.start || dateRange.end) && (
        <div className="flex flex-wrap gap-1">
          {activeFilters.map((filterId) => {
            const filter = PRESET_FILTERS.find(f => f.id === filterId);
            return filter ? (
              <Badge key={filterId} variant="secondary" className="text-xs">
                {filter.label}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-3 w-3 p-0 ml-1 hover:bg-transparent"
                  onClick={() => toggleFilter(filterId)}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ) : null;
          })}
          {(dateRange.start || dateRange.end) && (
            <Badge variant="secondary" className="text-xs">
              {dateRange.start && dateRange.end
                ? `${format(dateRange.start, "MMM d")} - ${format(dateRange.end, "MMM d")}`
                : dateRange.start
                ? `From ${format(dateRange.start, "MMM d")}`
                : `Until ${format(dateRange.end!, "MMM d")}`}
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0 ml-1 hover:bg-transparent"
                onClick={() => onDateRangeChange({ start: null, end: null })}
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}