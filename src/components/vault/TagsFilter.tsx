import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TagsFilterProps {
  availableTags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

export function TagsFilter({ availableTags, selectedTags, onChange }: TagsFilterProps) {
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  const clearAll = () => onChange([]);

  const label = selectedTags.length > 0 ? `Tags (${selectedTags.length})` : "Tags";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 text-sm">
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="medical-label">Filter by tags</span>
          {selectedTags.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={clearAll}>
              Clear
            </Button>
          )}
        </div>
        <div className="max-h-60 overflow-auto space-y-1 pr-1">
          {availableTags.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tags available</p>
          ) : (
            availableTags.map((tag) => (
              <label key={tag} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={selectedTags.includes(tag)}
                  onCheckedChange={() => toggleTag(tag)}
                />
                <span className="truncate">{tag}</span>
              </label>
            ))
          )}
        </div>
        {selectedTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedTags.map((t) => (
              <Badge key={t} variant="outline" className="text-xs">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
