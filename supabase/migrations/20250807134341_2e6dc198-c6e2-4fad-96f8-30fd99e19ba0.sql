-- Create dismissed_recommendations table
CREATE TABLE public.dismissed_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recommendation_type TEXT NOT NULL,
  recommendation_key TEXT NOT NULL,
  dismissed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, recommendation_type, recommendation_key)
);

-- Enable RLS
ALTER TABLE public.dismissed_recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies for dismissed_recommendations
CREATE POLICY "Users can view their own dismissed recommendations" 
ON public.dismissed_recommendations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own dismissed recommendations" 
ON public.dismissed_recommendations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dismissed recommendations" 
ON public.dismissed_recommendations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dismissed recommendations" 
ON public.dismissed_recommendations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Update profiles table to include recommendation preferences
ALTER TABLE public.profiles 
ADD COLUMN recommendation_preferences JSONB DEFAULT '{
  "frequency": "weekly",
  "preferred_specialties": [],
  "hide_dismissed": true,
  "urgency_threshold": "medium",
  "calendar_integration": false
}'::jsonb;