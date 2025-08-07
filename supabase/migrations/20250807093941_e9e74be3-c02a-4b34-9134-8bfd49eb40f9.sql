-- Create emergency_contacts table for multiple contacts
CREATE TABLE public.emergency_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  relationship TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT emergency_contacts_priority_check CHECK (priority > 0),
  CONSTRAINT emergency_contacts_phone_check CHECK (phone_number ~ '^[6-9]\d{9}$')
);

-- Enable RLS
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for emergency_contacts
CREATE POLICY "Users can view their own emergency contacts" 
ON public.emergency_contacts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own emergency contacts" 
ON public.emergency_contacts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emergency contacts" 
ON public.emergency_contacts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emergency contacts" 
ON public.emergency_contacts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create SOS activations log table
CREATE TABLE public.sos_activations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMP WITH TIME ZONE NULL,
  completed_at TIMESTAMP WITH TIME ZONE NULL,
  location_data JSONB NULL,
  status TEXT NOT NULL DEFAULT 'triggered' CHECK (status IN ('triggered', 'cancelled', 'completed')),
  sms_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sos_activations ENABLE ROW LEVEL SECURITY;

-- Create policies for sos_activations
CREATE POLICY "Users can view their own SOS activations" 
ON public.sos_activations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own SOS activations" 
ON public.sos_activations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SOS activations" 
ON public.sos_activations 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add SOS settings to profiles table
ALTER TABLE public.profiles 
ADD COLUMN sos_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN sos_countdown_duration INTEGER NOT NULL DEFAULT 30,
ADD COLUMN sos_message TEXT DEFAULT 'Emergency! I need help. This is an automated message from my health app.';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_emergency_contacts_updated_at
BEFORE UPDATE ON public.emergency_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sos_activations_updated_at
BEFORE UPDATE ON public.sos_activations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();