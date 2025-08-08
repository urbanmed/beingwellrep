
-- 1) Create doctor_notes table
CREATE TABLE public.doctor_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  note_type TEXT NOT NULL DEFAULT 'consultation', -- e.g., 'consultation' | 'prescription' | 'general'
  note_date DATE NOT NULL DEFAULT now()::date,
  physician_name TEXT,
  facility_name TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  related_report_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  attached_file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Enable RLS
ALTER TABLE public.doctor_notes ENABLE ROW LEVEL SECURITY;

-- 3) RLS policies
CREATE POLICY "Users can view their own doctor notes"
  ON public.doctor_notes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own doctor notes"
  ON public.doctor_notes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own doctor notes"
  ON public.doctor_notes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own doctor notes"
  ON public.doctor_notes
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4) Helpful indexes
CREATE INDEX doctor_notes_user_id_idx ON public.doctor_notes (user_id);
CREATE INDEX doctor_notes_note_date_idx ON public.doctor_notes (note_date);
CREATE INDEX doctor_notes_tags_gin_idx ON public.doctor_notes USING GIN (tags);
CREATE INDEX doctor_notes_related_report_ids_gin_idx ON public.doctor_notes USING GIN (related_report_ids);

-- 5) updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at ON public.doctor_notes;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.doctor_notes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
