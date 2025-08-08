import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote } from "lucide-react";
import { useDoctorNotes } from "@/hooks/useDoctorNotes";
import { DoctorNotesList } from "@/components/notes/DoctorNotesList";

interface ReportNotesButtonProps {
  reportId: string;
  reportTitle?: string;
}

export function ReportNotesButton({ reportId, reportTitle }: ReportNotesButtonProps) {
  const { notes, addNote, deleteNote } = useDoctorNotes();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const reportNotes = useMemo(() => {
    return (notes || []).filter((n) => Array.isArray(n.related_report_ids) && n.related_report_ids.includes(reportId));
  }, [notes, reportId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await addNote({ title: title.trim(), content: content.trim() || undefined, related_report_ids: [reportId] });
    setSaving(false);
    setTitle("");
    setContent("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          aria-label="Open notes"
          title="Notes"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <StickyNote className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Notes for {reportTitle ? `"${reportTitle}"` : "this document"}</DialogTitle>
          <DialogDescription>Add or review your doctor notes linked to this document.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid gap-2">
            <Input
              placeholder="Note title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Note title"
            />
            <Textarea
              placeholder="Write your note (optional)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              aria-label="Note content"
              className="min-h-[80px]"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? "Saving..." : "Save note"}
            </Button>
          </div>
        </form>

        <div className="space-y-2">
          <h3 className="medical-subheading">Existing notes</h3>
          <DoctorNotesList notes={reportNotes} onDelete={deleteNote} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
