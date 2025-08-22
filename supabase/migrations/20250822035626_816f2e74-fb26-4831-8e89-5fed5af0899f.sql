-- Add ABHA fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN abha_id text,
ADD COLUMN abha_linked_at timestamp with time zone,
ADD COLUMN abha_consent_given boolean DEFAULT false,
ADD COLUMN abha_consent_date timestamp with time zone,
ADD COLUMN abha_sync_status text DEFAULT 'not_linked',
ADD COLUMN abha_last_sync timestamp with time zone;

-- Create unique constraint on ABHA ID when not null
CREATE UNIQUE INDEX idx_profiles_abha_id ON public.profiles(abha_id) WHERE abha_id IS NOT NULL;

-- Create FHIR Patients table
CREATE TABLE public.fhir_patients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  fhir_id text NOT NULL,
  resource_data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create FHIR Observations table (for lab results, vitals)
CREATE TABLE public.fhir_observations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  fhir_id text NOT NULL,
  patient_fhir_id text NOT NULL,
  source_report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  observation_type text NOT NULL, -- 'vital_signs', 'lab_result', 'measurement'
  resource_data jsonb NOT NULL,
  effective_date_time timestamp with time zone,
  status text NOT NULL DEFAULT 'final',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create FHIR MedicationRequests table (for prescriptions)
CREATE TABLE public.fhir_medication_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  fhir_id text NOT NULL,
  patient_fhir_id text NOT NULL,
  source_prescription_id uuid REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  source_report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  medication_name text NOT NULL,
  resource_data jsonb NOT NULL,
  authored_on timestamp with time zone,
  status text NOT NULL DEFAULT 'active',
  intent text NOT NULL DEFAULT 'order',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create FHIR DiagnosticReports table
CREATE TABLE public.fhir_diagnostic_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  fhir_id text NOT NULL,
  patient_fhir_id text NOT NULL,
  source_report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  report_type text NOT NULL,
  resource_data jsonb NOT NULL,
  effective_date_time timestamp with time zone,
  status text NOT NULL DEFAULT 'final',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create FHIR Encounters table (for consultations)
CREATE TABLE public.fhir_encounters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  fhir_id text NOT NULL,
  patient_fhir_id text NOT NULL,
  source_note_id uuid REFERENCES public.doctor_notes(id) ON DELETE SET NULL,
  encounter_type text NOT NULL DEFAULT 'consultation',
  resource_data jsonb NOT NULL,
  period_start timestamp with time zone,
  period_end timestamp with time zone,
  status text NOT NULL DEFAULT 'finished',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create FHIR CarePlans table
CREATE TABLE public.fhir_care_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  fhir_id text NOT NULL,
  patient_fhir_id text NOT NULL,
  title text NOT NULL,
  description text,
  resource_data jsonb NOT NULL,
  period_start timestamp with time zone,
  period_end timestamp with time zone,
  status text NOT NULL DEFAULT 'active',
  intent text NOT NULL DEFAULT 'plan',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all new FHIR tables
ALTER TABLE public.fhir_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fhir_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fhir_medication_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fhir_diagnostic_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fhir_encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fhir_care_plans ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for FHIR tables
CREATE POLICY "Users can create their own FHIR patients" ON public.fhir_patients
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own FHIR patients" ON public.fhir_patients
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own FHIR patients" ON public.fhir_patients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own FHIR observations" ON public.fhir_observations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own FHIR observations" ON public.fhir_observations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own FHIR observations" ON public.fhir_observations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own FHIR medication requests" ON public.fhir_medication_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own FHIR medication requests" ON public.fhir_medication_requests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own FHIR medication requests" ON public.fhir_medication_requests
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own FHIR diagnostic reports" ON public.fhir_diagnostic_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own FHIR diagnostic reports" ON public.fhir_diagnostic_reports
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own FHIR diagnostic reports" ON public.fhir_diagnostic_reports
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own FHIR encounters" ON public.fhir_encounters
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own FHIR encounters" ON public.fhir_encounters
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own FHIR encounters" ON public.fhir_encounters
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own FHIR care plans" ON public.fhir_care_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own FHIR care plans" ON public.fhir_care_plans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own FHIR care plans" ON public.fhir_care_plans
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_fhir_patients_user_id ON public.fhir_patients(user_id);
CREATE INDEX idx_fhir_patients_fhir_id ON public.fhir_patients(fhir_id);

CREATE INDEX idx_fhir_observations_user_id ON public.fhir_observations(user_id);
CREATE INDEX idx_fhir_observations_patient_fhir_id ON public.fhir_observations(patient_fhir_id);
CREATE INDEX idx_fhir_observations_type ON public.fhir_observations(observation_type);
CREATE INDEX idx_fhir_observations_effective_date ON public.fhir_observations(effective_date_time);

CREATE INDEX idx_fhir_medication_requests_user_id ON public.fhir_medication_requests(user_id);
CREATE INDEX idx_fhir_medication_requests_patient_fhir_id ON public.fhir_medication_requests(patient_fhir_id);
CREATE INDEX idx_fhir_medication_requests_authored_on ON public.fhir_medication_requests(authored_on);

CREATE INDEX idx_fhir_diagnostic_reports_user_id ON public.fhir_diagnostic_reports(user_id);
CREATE INDEX idx_fhir_diagnostic_reports_patient_fhir_id ON public.fhir_diagnostic_reports(patient_fhir_id);
CREATE INDEX idx_fhir_diagnostic_reports_effective_date ON public.fhir_diagnostic_reports(effective_date_time);

CREATE INDEX idx_fhir_encounters_user_id ON public.fhir_encounters(user_id);
CREATE INDEX idx_fhir_encounters_patient_fhir_id ON public.fhir_encounters(patient_fhir_id);
CREATE INDEX idx_fhir_encounters_period_start ON public.fhir_encounters(period_start);

CREATE INDEX idx_fhir_care_plans_user_id ON public.fhir_care_plans(user_id);
CREATE INDEX idx_fhir_care_plans_patient_fhir_id ON public.fhir_care_plans(patient_fhir_id);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_fhir_patients_updated_at
  BEFORE UPDATE ON public.fhir_patients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fhir_observations_updated_at
  BEFORE UPDATE ON public.fhir_observations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fhir_medication_requests_updated_at
  BEFORE UPDATE ON public.fhir_medication_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fhir_diagnostic_reports_updated_at
  BEFORE UPDATE ON public.fhir_diagnostic_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fhir_encounters_updated_at
  BEFORE UPDATE ON public.fhir_encounters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fhir_care_plans_updated_at
  BEFORE UPDATE ON public.fhir_care_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();