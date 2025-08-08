
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DoctorNote {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  note_type: string; // 'consultation' | 'prescription' | 'general' | etc
  note_date: string; // date
  physician_name: string | null;
  facility_name: string | null;
  tags: string[];
  related_report_ids: string[];
  attached_file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDoctorNoteInput {
  title: string;
  content?: string;
  note_type?: string;
  note_date?: string; // yyyy-mm-dd
  physician_name?: string;
  facility_name?: string;
  tags?: string[];
  related_report_ids?: string[];
  attached_file_url?: string | null;
}

export function useDoctorNotes() {
  const [notes, setNotes] = useState<DoctorNote[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("doctor_notes")
        .select("*")
        .order("note_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes((data || []) as DoctorNote[]);
    } catch (err) {
      console.error("Error fetching doctor notes:", err);
      toast({
        title: "Error",
        description: "Failed to load doctor notes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addNote = async (input: CreateDoctorNoteInput) => {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) {
      toast({
        title: "Not signed in",
        description: "Please sign in to create notes.",
        variant: "destructive",
      });
      return null;
    }

    const payload = {
      user_id: userId,
      title: input.title,
      content: input.content ?? null,
      note_type: input.note_type ?? "consultation",
      note_date: input.note_date ?? new Date().toISOString().slice(0, 10),
      physician_name: input.physician_name ?? null,
      facility_name: input.facility_name ?? null,
      tags: input.tags ?? [],
      related_report_ids: input.related_report_ids ?? [],
      attached_file_url: input.attached_file_url ?? null,
    };

    const { data, error } = await supabase
      .from("doctor_notes")
      .insert([payload])
      .select("*")
      .single();

    if (error) {
      console.error("Error creating note:", error);
      toast({
        title: "Error",
        description: "Could not create note.",
        variant: "destructive",
      });
      return null;
    }

    setNotes((prev) => [data as DoctorNote, ...prev]);
    toast({
      title: "Note added",
      description: "Your doctor note has been saved.",
    });
    return data as DoctorNote;
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from("doctor_notes").delete().eq("id", id);

    if (error) {
      console.error("Error deleting note:", error);
      toast({
        title: "Error",
        description: "Failed to delete note.",
        variant: "destructive",
      });
      return;
    }

    setNotes((prev) => prev.filter((n) => n.id !== id));
    toast({
      title: "Note deleted",
      description: "The note was removed.",
    });
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  return {
    notes,
    loading,
    fetchNotes,
    addNote,
    deleteNote,
    refetch: fetchNotes,
  };
}
