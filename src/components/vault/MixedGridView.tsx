import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TimelineItem as TimelineItemType } from "@/hooks/useTimeline";
import { Brain, Eye, FileText, Pin, Star, Trash, Pill, Sparkles, Download } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { AddPrescriptionDialog } from "@/components/prescriptions/AddPrescriptionDialog";
import { GenerateSummaryDialogWrapper } from "@/components/summaries/GenerateSummaryDialogWrapper";
import { DeleteConfirmDialog } from "@/components/reports/DeleteConfirmDialog";
import { useFileDownload } from "@/hooks/useFileDownload";
import { useReports } from "@/hooks/useReports";

interface MixedGridViewProps {
  items: TimelineItemType[];
  onViewDetails: (item: TimelineItemType) => void;
  onDelete: (item: TimelineItemType) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (item: TimelineItemType, checked: boolean) => void;
}

export function MixedGridView({ items, onViewDetails, onDelete, selectionMode = false, selectedIds, onToggleSelect }: MixedGridViewProps) {
  const { downloadFile } = useFileDownload();
  const { deleteReport } = useReports();
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TimelineItemType | null>(null);

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    return format(date, "MMM d, yyyy");
  };

  const handleAddPrescription = (item: TimelineItemType) => {
    setSelectedItem(item);
    setShowPrescriptionDialog(true);
  };

  const handleGenerateSummary = (item: TimelineItemType) => {
    setSelectedItem(item);
    setShowSummaryDialog(true);
  };

  const handleDownload = (item: TimelineItemType) => {
    // Note: TimelineItem doesn't have file URL, so we'll need to handle this differently
    // For now, we'll skip this as the timeline items don't contain direct file references
  };

  const handleDeleteClick = (item: TimelineItemType) => {
    setSelectedItem(item);
    setShowDeleteDialog(true);
  };

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <Card key={item.id} className="group transition-all duration-200 hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {selectionMode && (
                <div className="pt-1">
                  <Checkbox
                    checked={selectedIds?.has(item.id) ?? false}
                    onCheckedChange={(checked) => onToggleSelect?.(item, !!checked)}
                    aria-label="Select item"
                  />
                </div>
              )}
              <div className="flex-shrink-0 mt-0.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.type === 'report' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent-foreground'}`}>
                  {item.type === 'report' ? <FileText className="h-4 w-4" /> : <Brain className="h-4 w-4" />}
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm truncate leading-tight">{item.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{formatDate(item.date)}</span>
                      {item.type === 'report' ? (
                        <Badge variant={item.parsingStatus === 'completed' ? 'success' : item.parsingStatus === 'failed' ? 'destructive' : item.parsingStatus === 'processing' ? 'warning' : 'outline'} className="text-[11px]">
                          {item.parsingStatus === 'completed' ? 'Processed' : item.parsingStatus?.charAt(0).toUpperCase() + (item.parsingStatus || '').slice(1)}
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[11px] capitalize">{item.summaryType?.replace('_',' ')}</Badge>
                          {item.isPinned && <Pin className="h-3 w-3 text-primary" />}
                          {item.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-warning fill-current" />
                              <span className="text-[11px]">{item.rating}/5</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <TooltipProvider>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onViewDetails(item)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View</TooltipContent>
                      </Tooltip>

                      {item.type === 'report' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleAddPrescription(item)}>
                              <Pill className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Add Prescription</TooltipContent>
                        </Tooltip>
                      )}

                      {item.type === 'report' && item.parsingStatus === 'completed' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleGenerateSummary(item)}>
                              <Sparkles className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Generate AI Summary</TooltipContent>
                        </Tooltip>
                      )}

                      {/* Download removed for timeline items as they don't contain file URLs */}

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteClick(item)}>
                            <Trash className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </div>

                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                )}

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {item.tags.slice(0, 3).map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-[11px]">{tag}</Badge>
                    ))}
                    {item.tags.length > 3 && (
                      <Badge variant="outline" className="text-[11px]">+{item.tags.length - 3}</Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Dialogs */}
      {selectedItem && selectedItem.type === 'report' && (
        <>
          <AddPrescriptionDialog 
            isOpen={showPrescriptionDialog} 
            onClose={() => setShowPrescriptionDialog(false)}
            sourceReportId={selectedItem.id}
            sourceReportTitle={selectedItem.title}
          />
          
          <GenerateSummaryDialogWrapper
            isOpen={showSummaryDialog}
            onClose={() => setShowSummaryDialog(false)}
            preSelectedReportIds={[selectedItem.id]}
          />
          
          <DeleteConfirmDialog
            isOpen={showDeleteDialog}
            onClose={() => setShowDeleteDialog(false)}
            onConfirm={() => {
              if (selectedItem.type === 'report') {
                deleteReport(selectedItem.id);
              } else {
                onDelete(selectedItem);
              }
              setShowDeleteDialog(false);
            }}
            title={`Delete ${selectedItem.title}?`}
            description={`Are you sure you want to delete this ${selectedItem.type}? This action cannot be undone.`}
          />
        </>
      )}
    </div>
  );
}
