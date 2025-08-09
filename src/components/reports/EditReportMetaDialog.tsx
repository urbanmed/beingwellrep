import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReportTypeSelector } from "@/components/upload/ReportTypeSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EditReportMetaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
  initialReportType?: string;
  initialTags?: string[];
  onSaved?: () => void | Promise<void>;
}

export function EditReportMetaDialog({ open, onOpenChange, reportId, initialReportType, initialTags, onSaved }: EditReportMetaDialogProps) {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<string>(initialReportType || "general");
  const [tagsInput, setTagsInput] = useState<string>((initialTags || []).join(", "));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setReportType(initialReportType || "general");
      setTagsInput((initialTags || []).join(", "));
    }
  }, [open, initialReportType, initialTags]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportId) return;
    setSaving(true);
    try {
      const tags = Array.from(
        new Set(
          tagsInput
            .split(/[,\n]/)
            .map((t) => t.trim())
            .filter(Boolean)
        )
      );

      const { error } = await supabase
        .from("reports")
        .update({ report_type: reportType, tags })
        .eq("id", reportId);

      if (error) throw error;

      toast({ title: "Saved", description: "Report details updated successfully" });
      await onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Failed to update report:", err);
      toast({ title: "Error", description: err.message || "Failed to update report", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit report details</DialogTitle>
          <DialogDescription>Update report type and tags for better organization.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reportType">Report type</Label>
            <ReportTypeSelector value={reportType} onChange={setReportType} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma or new line separated)</Label>
            <Input
              id="tags"
              placeholder="e.g. cholesterol, fasting, follow-up"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
