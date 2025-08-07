import { useState, useEffect } from "react";
import { CalendarIcon, Filter, X, ChevronDown, ChevronRight, TestTube, Scan, Activity, FileText, Pill, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TimelineFiltersProps {
  activeFilters: string[];
  onFilterChange: (filters: string[]) => void;
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  onClearAll: () => void;
}

const FILTER_CATEGORIES = [
  {
    id: "lab-work",
    label: "Lab Work & Testing",
    icon: "TestTube",
    subcategories: [
      { id: "blood-tests", label: "Blood Tests", reportTypes: ["blood_test", "lab_results"] },
      { id: "urinalysis", label: "Urinalysis", reportTypes: ["lab_results"] },
      { id: "hormone-tests", label: "Hormone Tests", reportTypes: ["lab_results"] },
      { id: "allergy-testing", label: "Allergy Testing", reportTypes: ["allergy"] },
    ]
  },
  {
    id: "imaging",
    label: "Medical Imaging",
    icon: "Scan",
    subcategories: [
      { id: "xrays", label: "X-rays", reportTypes: ["radiology"] },
      { id: "mri-scans", label: "MRI Scans", reportTypes: ["radiology"] },
      { id: "ct-scans", label: "CT Scans", reportTypes: ["radiology"] },
      { id: "ultrasounds", label: "Ultrasounds", reportTypes: ["radiology"] },
      { id: "mammograms", label: "Mammograms", reportTypes: ["radiology"] },
    ]
  },
  {
    id: "procedures",
    label: "Procedures & Surgery",
    icon: "Activity",
    subcategories: [
      { id: "cardiac-procedures", label: "Cardiac Procedures", reportTypes: ["procedure"] },
      { id: "surgical-reports", label: "Surgical Reports", reportTypes: ["procedure"] },
      { id: "endoscopy", label: "Endoscopy", reportTypes: ["procedure"] },
      { id: "biopsy", label: "Biopsy", reportTypes: ["procedure", "pathology"] },
    ]
  },
  {
    id: "consultations",
    label: "Consultations & Notes",
    icon: "FileText",
    subcategories: [
      { id: "specialist-consults", label: "Specialist Consultations", reportTypes: ["consultation"] },
      { id: "follow-up-notes", label: "Follow-up Notes", reportTypes: ["consultation"] },
      { id: "treatment-plans", label: "Treatment Plans", reportTypes: ["consultation"] },
      { id: "referrals", label: "Referrals", reportTypes: ["consultation"] },
    ]
  },
  {
    id: "medications",
    label: "Medications & Prescriptions",
    icon: "Pill",
    subcategories: [
      { id: "prescriptions", label: "Prescriptions", reportTypes: ["prescription"] },
      { id: "medication-reviews", label: "Medication Reviews", reportTypes: ["consultation"] },
      { id: "dosage-changes", label: "Dosage Changes", reportTypes: ["prescription"] },
    ]
  },
  {
    id: "preventive",
    label: "Preventive Care",
    icon: "Shield",
    subcategories: [
      { id: "vaccinations", label: "Vaccinations", reportTypes: ["vaccination"] },
      { id: "screenings", label: "Health Screenings", reportTypes: ["general", "consultation"] },
      { id: "wellness-visits", label: "Wellness Visits", reportTypes: ["consultation"] },
    ]
  },
  {
    id: "emergency",
    label: "Emergency & Urgent Care",
    icon: "AlertTriangle",
    subcategories: [
      { id: "er-visits", label: "Emergency Room Visits", reportTypes: ["general", "consultation"] },
      { id: "urgent-care", label: "Urgent Care Visits", reportTypes: ["consultation"] },
      { id: "discharge-summaries", label: "Discharge Summaries", reportTypes: ["discharge"] },
    ]
  }
];

const TIME_FILTERS = [
  { id: "last-7-days", label: "Last 7 days", days: 7 },
  { id: "last-30-days", label: "Last 30 days", days: 30 },
  { id: "last-90-days", label: "Last 90 days", days: 90 },
  { id: "last-year", label: "Last year", days: 365 },
];

const SPECIAL_FILTERS = [
  { id: "critical-reports", label: "Critical/Urgent Reports", condition: "is_critical" },
  { id: "processing-errors", label: "Processing Errors", condition: "failed_processing" },
  { id: "missing-data", label: "Missing Information", condition: "incomplete_data" },
];

const ICON_MAP = {
  TestTube,
  Scan,
  Activity,
  FileText,
  Pill,
  Shield,
  AlertTriangle,
};

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
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["lab-work"]);

  const toggleFilter = (filterId: string) => {
    if (tempActiveFilters.includes(filterId)) {
      setTempActiveFilters(tempActiveFilters.filter(f => f !== filterId));
    } else {
      setTempActiveFilters([...tempActiveFilters, filterId]);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
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
        // Check all filter categories for the active filter
        for (const category of FILTER_CATEGORIES) {
          const subcategory = category.subcategories.find(sub => sub.id === activeFilters[0]);
          if (subcategory) return subcategory.label;
        }
        
        // Check time filters
        const timeFilter = TIME_FILTERS.find(f => f.id === activeFilters[0]);
        if (timeFilter) return timeFilter.label;
        
        // Check special filters
        const specialFilter = SPECIAL_FILTERS.find(f => f.id === activeFilters[0]);
        if (specialFilter) return specialFilter.label;
        
        return "1 filter";
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
      <PopoverContent className="w-96 p-0 max-h-[600px] overflow-y-auto" align="start">
        <div className="p-4 space-y-4">
          {/* Medical Categories */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Medical Categories</h4>
            <div className="space-y-1">
              {FILTER_CATEGORIES.map((category) => {
                const IconComponent = ICON_MAP[category.icon as keyof typeof ICON_MAP];
                const isExpanded = expandedCategories.includes(category.id);
                
                return (
                  <Collapsible key={category.id} open={isExpanded} onOpenChange={() => toggleCategory(category.id)}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-left hover:bg-muted/50 rounded-md">
                      <div className="flex items-center space-x-2">
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{category.label}</span>
                      </div>
                      <ChevronRight className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-90")} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ml-6 space-y-1">
                      {category.subcategories.map((subcategory) => (
                        <div key={subcategory.id} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            id={subcategory.id}
                            checked={tempActiveFilters.includes(subcategory.id)}
                            onCheckedChange={() => toggleFilter(subcategory.id)}
                          />
                          <label
                            htmlFor={subcategory.id}
                            className="text-sm font-normal leading-none cursor-pointer flex-1"
                          >
                            {subcategory.label}
                          </label>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Time-based Filters */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Time Period</h4>
            <div className="space-y-2">
              {TIME_FILTERS.map((filter) => (
                <div key={filter.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={filter.id}
                    checked={tempActiveFilters.includes(filter.id)}
                    onCheckedChange={() => toggleFilter(filter.id)}
                  />
                  <label
                    htmlFor={filter.id}
                    className="text-sm font-normal leading-none cursor-pointer"
                  >
                    {filter.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Special Filters */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Special Filters</h4>
            <div className="space-y-2">
              {SPECIAL_FILTERS.map((filter) => (
                <div key={filter.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={filter.id}
                    checked={tempActiveFilters.includes(filter.id)}
                    onCheckedChange={() => toggleFilter(filter.id)}
                  />
                  <label
                    htmlFor={filter.id}
                    className="text-sm font-normal leading-none cursor-pointer"
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