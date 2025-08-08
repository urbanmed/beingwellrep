
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CreateDoctorNoteInput } from "@/hooks/useDoctorNotes";
import { Report } from "@/hooks/useReports";
import { Plus, Save } from "lucide-react";

interface DoctorNoteFormProps {
  onCreate: (input: CreateDoctorNoteInput) => Promise<any>;
  reports: Report[];
}

const NOTE_TYPES = [
  { value: "consultation", label: "Consultation" },
  { value: "prescription", label: "Prescription" },
  { value: "general", label: "General" },
];

export function DoctorNoteForm({ onCreate, reports }: DoctorNoteFormProps) {
  const [title, setTitle] = useState("");
  const [noteType, setNoteType] = useState("consultation");
  const [noteDate, setNoteDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [physician, setPhysician] = useState("");
  const [facility, setFacility] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const tags = tagsInput
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const toggleReport = (id: string) => {
    setSelectedReportIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    await onCreate({
      title: title.trim(),
      content: content.trim() || undefined,
      note_type: noteType,
      note_date: noteDate,
      physician_name: physician.trim() || undefined,
      facility_name: facility.trim() || undefined,
      tags,
      related_report_ids: selectedReportIds,
    });
    setSubmitting(false);

    // Reset form
    setTitle("");
    setContent("");
    setPhysician("");
    setFacility("");
    setTagsInput("");
    setSelectedReportIds([]);
    setNoteType("consultation");
    setNoteDate(new Date().toISOString().slice(0,10));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">Add Doctor Note</h3>
        <Badge variant="outline" className="text-xs">New</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Follow-up Visit Summary" required />
        </div>

        <div>
          <Label htmlFor="noteDate">Date</Label>
          <Input id="noteDate" type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} />
        </div>

        <div>
          <Label>Type</Label>
          <Select value={noteType} onValueChange={setNoteType}>
            <SelectTrigger>
              <SelectValue placeholder="Select note type" />
            </SelectTrigger>
            <SelectContent>
              {NOTE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="physician">Physician</Label>
          <Input id="physician" value={physician} onChange={(e) => setPhysician(e.target.value)} placeholder="Dr. Jane Doe" />
        </div>

        <div>
          <Label htmlFor="facility">Facility</Label>
          <Input id="facility" value={facility} onChange={(e) => setFacility(e.target.value)} placeholder="City Health Clinic" />
        </div>

        <div>
          <Label htmlFor="tags">Tags (comma separated)</Label>
          <Input id="tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="blood pressure, follow-up" />
        </div>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
      )}

      <div>
        <Label htmlFor="content">Notes</Label>
        <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Key observations, plan, and reminders..." className="min-h-[100px]" />
      </div>

      <div className="space-y-2">
        <Label>Related Reports</Label>
        <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
          {reports.length === 0 ? (
            <p className="text-xs text-muted-foreground">No reports available yet.</p>
          ) : (
            reports.slice(0, 30).map((r) => (
              <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedReportIds.includes(r.id)}
                  onChange={() => toggleReport(r.id)}
                />
                <span className="truncate">{r.title || r.file_name || "Untitled"}</span>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={submitting}>
          <Save className="h-4 w-4 mr-2" />
          {submitting ? "Saving..." : "Save Note"}
        </Button>
        <Button type="button" variant="outline" onClick={() => {
          setTitle(""); setContent(""); setPhysician(""); setFacility(""); setTagsInput("");
          setSelectedReportIds([]); setNoteType("consultation"); setNoteDate(new Date().toISOString().slice(0,10));
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>
    </form>
  );
}
