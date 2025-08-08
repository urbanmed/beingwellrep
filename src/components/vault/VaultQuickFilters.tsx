import { Badge } from "@/components/ui/badge";

export type QuickFilter = 'all' | 'critical' | 'processing_errors' | 'untagged';

interface VaultQuickFiltersProps {
  active?: QuickFilter;
  onApply: (filter: QuickFilter) => void;
}

export function VaultQuickFilters({ active = 'all', onApply }: VaultQuickFiltersProps) {
  const chips: { key: QuickFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'critical', label: 'Critical' },
    { key: 'processing_errors', label: 'Processing Errors' },
    { key: 'untagged', label: 'Untagged' },
  ];

  return (
    <nav aria-label="Smart quick filters" className="flex flex-wrap gap-2">
      {chips.map(c => (
        <Badge
          key={c.key}
          variant={active === c.key ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => onApply(c.key)}
        >
          {c.label}
        </Badge>
      ))}
    </nav>
  );
}
