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
import { supabase } from "@/integrations/supabase/client";
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
  const [file, setFile] = useState<File | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const reportNotes = useMemo(() => {
    return (notes || []).filter((n) => Array.isArray(n.related_report_ids) && n.related_report_ids.includes(reportId));
  }, [notes, reportId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    let attached_file_url: string | null = null;
    try {
      if (file) {
        const { data: userRes } = await supabase.auth.getUser();
        const userId = userRes.user?.id;
        if (userId) {
          const path = `doctor-notes/${userId}/${Date.now()}-${file.name}`;
          const { error: uploadErr } = await supabase.storage
            .from("medical-documents")
            .upload(path, file);
          if (!uploadErr) {
            // Store storage path; signed URLs will be generated when displaying attachments
            attached_file_url = path;
          }
        }
      }

      await addNote({ title: title.trim(), content: content.trim() || undefined, related_report_ids: [reportId], attached_file_url });
    } finally {
      setSaving(false);
      setTitle("");
      setContent("");
      setFile(null);
    }
  };

  const handleSuggestAI = async () => {
    setAiLoading(true);
    try {
      const prompt = `Draft a concise doctor's note linked to report "${reportTitle || ''}". Include key observations and next steps.`;
      const { data } = await supabase.functions.invoke("ai-medical-assistant", {
        body: { message: prompt, conversation_id: crypto.randomUUID() },
      });
      if (data?.response) {
        setContent(data.response);
      }
    } finally {
      setAiLoading(false);
    }
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
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Button type="button" variant="outline" onClick={handleSuggestAI} disabled={aiLoading}>
              {aiLoading ? "Generating..." : "Suggest with AI"}
            </Button>
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
