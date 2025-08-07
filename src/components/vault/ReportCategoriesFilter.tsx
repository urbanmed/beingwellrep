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
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="h-9 gap-2 text-xs"
          >
            <Filter className="h-4 w-4" />
            Categories
            {selectedCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-xs">
                {selectedCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="medical-subheading">Filter by Health Categories</h4>
              {selectedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  className="h-6 px-2 text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              {HEALTH_CATEGORIES.map((category) => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={category.id}
                    checked={selectedCategories.includes(category.id)}
                    onCheckedChange={() => handleCategoryToggle(category.id)}
                  />
                  <label
                    htmlFor={category.id}
                    className="medical-label flex-1 cursor-pointer hover:text-foreground transition-colors"
                  >
                    {category.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter badges */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-1">
          {selectedCategories.slice(0, 3).map((categoryId) => {
            const category = HEALTH_CATEGORIES.find(c => c.id === categoryId);
            return (
              <Badge 
                key={categoryId} 
                variant="secondary" 
                className="h-6 text-xs gap-1"
              >
                {category?.label}
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-foreground" 
                  onClick={() => handleCategoryToggle(categoryId)}
                />
              </Badge>
            );
          })}
          {selectedCount > 3 && (
            <Badge variant="secondary" className="h-6 text-xs">
              +{selectedCount - 3} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}