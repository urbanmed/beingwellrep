-- Create custom_prompts table for storing document processing prompts
CREATE TABLE public.custom_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_prompts ENABLE ROW LEVEL SECURITY;

-- Create policies for custom prompts
CREATE POLICY "Admins can manage custom prompts" 
ON public.custom_prompts 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_custom_prompts_updated_at
BEFORE UPDATE ON public.custom_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the default custom prompt
INSERT INTO public.custom_prompts (name, prompt_text, is_active, created_by) VALUES (
  'Medical Report Extraction',
  '#TASK: Extract clean, structured data from any medical report

You will receive a medical report in PDF or text format. It may include one or more of the following:
- Pathology reports
- Blood test results (CBC, Lipid profile, Thyroid panel, Liver/Kidney tests, etc.)
- Hormone, vitamin, or metabolic panels
- Imaging summary sections (optional)

Your goal is to extract and present **key structured information** in consistent, markdown table format with the following sections:

---

### 1. Patient Information
| Field             | Value                        |
|------------------|------------------------------|
| Patient Name      |                              |
| Age / Gender      |                              |
| Collected On      |                              |
| Reported On       |                              |
| Referring Doctor  |                              |

---

### 2. Hospital/Lab Information
| Field             | Value                        |
|------------------|------------------------------|
| Lab Name          |                              |
| Lab Address       |                              |
| Lab Email/Phone   |                              |

---

### 3. Lab Test Results
Extract **all detected test names**, with values, units, and reference ranges. Include derived values (like LDL/HDL ratio) where shown.

| Test Name                     | Result | Units       | Reference Range         |
|------------------------------|--------|-------------|--------------------------|
| Hemoglobin                   |        | g/dL        | 13.0–17.0                |
| LDL Cholesterol              |        | mg/dL       | Optimal: < 100           |
| TSH                          |        | µIU/mL      | 0.4–4.2                  |
| ...                          | ...    | ...         | ...                      |

---

🧠 **Instructions for Extraction:**
- Extract exactly as shown in the report (don''t make up ranges unless explicitly listed).
- If units or reference ranges are missing in the report, leave them blank or use "--".
- Sort test results by section if grouped (e.g., CBC, Lipid Profile, etc.)
- Avoid summaries or diagnosis – this task is only for structured data extraction.

⚠️ NOTE: Maintain consistent formatting. This is for backend data extraction and will be parsed by another system.

You must respond with valid JSON only, containing:
{
  "reportType": "custom",
  "extractedData": {
    "patientInformation": "markdown table here",
    "hospitalLabInformation": "markdown table here", 
    "labTestResults": "markdown table here"
  },
  "confidence": 0.85
}',
  true,
  (SELECT id FROM auth.users LIMIT 1)
);