
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, FileText, Trash2 } from "lucide-react";
import { DoctorNote } from "@/hooks/useDoctorNotes";
import { format, parseISO } from "date-fns";

interface DoctorNoteCardProps {
  note: DoctorNote;
  onDelete?: (id: string) => void;
}

const typeVariant = (type: string) => {
  switch (type) {
    case "prescription": return "success";
    case "general": return "secondary";
    default: return "default";
  }
};

export function DoctorNoteCard({ note, onDelete }: DoctorNoteCardProps) {
  const dateLabel = note.note_date ? format(parseISO(note.note_date), "MMM d, yyyy") : "";

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold truncate">{note.title}</h4>
              <Badge variant={typeVariant(note.note_type)} className="text-xs capitalize">
                {note.note_type}
              </Badge>
              <div className="flex items-center text-xs text-muted-foreground gap-1">
                <Calendar className="h-3 w-3" />
                <span>{dateLabel}</span>
              </div>
            </div>

            {(note.physician_name || note.facility_name) && (
              <div className="text-xs text-muted-foreground mt-1">
                {note.physician_name ? `Dr. ${note.physician_name}` : ""}
                {note.physician_name && note.facility_name ? " • " : ""}
                {note.facility_name || ""}
              </div>
            )}

            {note.content && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                {note.content}
              </p>
            )}

            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {note.tags.map((t, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                ))}
              </div>
            )}

            {note.related_report_ids && note.related_report_ids.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                <FileText className="h-3 w-3" />
                <span>{note.related_report_ids.length} related report(s)</span>
              </div>
            )}
          </div>

          {onDelete && (
            <Button variant="ghost" size="icon" onClick={() => onDelete(note.id)} className="shrink-0">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
