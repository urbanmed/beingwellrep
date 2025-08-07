import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

interface ReportCategoriesFilterProps {
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
  onClearAll: () => void;
}

// Health categories mapping
const HEALTH_CATEGORIES = [
  {
    id: "blood-tests",
    label: "Blood Tests",
    reportTypes: ["blood_test", "lab_results"],
    count: 0 // This will be calculated dynamically
  },
  {
    id: "genetic-reports",
    label: "Genetic Reports", 
    reportTypes: ["genetic", "pathology"],
    count: 0
  },
  {
    id: "thyroid-hormone",
    label: "Thyroid/Hormone",
    reportTypes: ["lab_results", "endocrine"],
    count: 0
  },
  {
    id: "heart-cardiac",
    label: "Heart & Cardiac",
    reportTypes: ["cardiology", "procedure"],
    count: 0
  },
  {
    id: "neurology",
    label: "Neurology",
    reportTypes: ["neurology", "radiology"],
    count: 0
  },
  {
    id: "nutrition-diet",
    label: "Nutrition/Diet",
    reportTypes: ["nutrition", "consultation"],
    count: 0
  },
  {
    id: "microbiome-gut",
    label: "Microbiome/Gut",
    reportTypes: ["microbiome", "lab_results"],
    count: 0
  },
  {
    id: "other-misc",
    label: "Other/Miscellaneous",
    reportTypes: ["general", "consultation", "discharge"],
    count: 0
  }
];

export function ReportCategoriesFilter({ 
  selectedCategories, 
  onCategoryChange, 
  onClearAll 
}: ReportCategoriesFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleCategoryToggle = (categoryId: string) => {
    const updated = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    onCategoryChange(updated);
  };

  const selectedCount = selectedCategories.length;

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="h-9 gap-1 sm:gap-2 text-xs sm:text-sm shrink-0"
            size="sm"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Categories</span>
            <span className="sm:hidden">Filter</span>
            {selectedCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 sm:h-5 min-w-4 sm:min-w-5 text-xs">
                {selectedCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 sm:w-80" align="start" side="bottom" sideOffset={8}>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm sm:text-base font-medium">Filter by Categories</h4>
              {selectedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  className="h-7 sm:h-8 px-2 text-xs sm:text-sm"
                >
                  Clear all
                </Button>
              )}
            </div>
            
            <Separator />
            
            <div className="space-y-2 sm:space-y-3 max-h-60 overflow-y-auto">
              {HEALTH_CATEGORIES.map((category) => (
                <div key={category.id} className="flex items-center space-x-3 py-1 touch-target min-h-[44px] sm:min-h-0 sm:py-0">
                  <Checkbox
                    id={category.id}
                    checked={selectedCategories.includes(category.id)}
                    onCheckedChange={() => handleCategoryToggle(category.id)}
                    className="h-4 w-4"
                  />
                  <label
                    htmlFor={category.id}
                    className="text-sm flex-1 cursor-pointer hover:text-foreground transition-colors leading-relaxed"
                  >
                    {category.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter badges - mobile responsive */}
      {selectedCount > 0 && (
        <div className="hidden sm:flex items-center gap-1 overflow-x-auto">
          {selectedCategories.slice(0, 2).map((categoryId) => {
            const category = HEALTH_CATEGORIES.find(c => c.id === categoryId);
            return (
              <Badge 
                key={categoryId} 
                variant="secondary" 
                className="h-6 text-xs gap-1 shrink-0"
              >
                <span className="truncate max-w-[80px]">{category?.label}</span>
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-foreground shrink-0" 
                  onClick={() => handleCategoryToggle(categoryId)}
                />
              </Badge>
            );
          })}
          {selectedCount > 2 && (
            <Badge variant="secondary" className="h-6 text-xs shrink-0">
              +{selectedCount - 2}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}