
import { DoctorNote } from "@/hooks/useDoctorNotes";
import { DoctorNoteCard } from "./DoctorNoteCard";

interface DoctorNotesListProps {
  notes: DoctorNote[];
  onDelete: (id: string) => void;
}

export function DoctorNotesList({ notes, onDelete }: DoctorNotesListProps) {
  if (!notes || notes.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No notes yet. Add your first doctor note from the form.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {notes.map((note) => (
        <DoctorNoteCard key={note.id} note={note} onDelete={onDelete} />
      ))}
    </div>
  );
}
