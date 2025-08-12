import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TemplateRequest {
  templateId?: string;
  templateType?: string;
  format?: 'csv' | 'json';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { templateId, templateType, format = 'csv' }: TemplateRequest = await req.json();
    
    let template;
    
    if (templateId) {
      // Get specific template by ID
      const { data, error } = await supabaseClient
        .from('import_templates')
        .select('*')
        .eq('id', templateId)
        .eq('is_active', true)
        .single();
        
      if (error || !data) {
        throw new Error('Template not found');
      }
      
      template = data;
    } else {
      // Generate template by type
      template = generateTemplateByType(templateType || 'medical_records', format);
    }

    let fileContent = '';
    let fileName = '';
    let mimeType = '';

    if (format === 'csv') {
      const { content, filename } = generateCSVTemplate(template);
      fileContent = content;
      fileName = filename;
      mimeType = 'text/csv';
    } else if (format === 'json') {
      const { content, filename } = generateJSONTemplate(template);
      fileContent = content;
      fileName = filename;
      mimeType = 'application/json';
    }

    console.log(`Generated template: ${fileName}`);

    return new Response(JSON.stringify({
      success: true,
      template: {
        fileName,
        content: fileContent,
        mimeType,
        description: template.description
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Template generation error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateTemplateByType(type: string, format: string) {
  const templates = {
    medical_records: {
      name: 'Medical Records Template',
      description: 'Template for importing general medical records',
      file_type: format,
      template_data: {
        headers: ['report_date', 'title', 'physician_name', 'facility_name', 'report_type', 'description', 'tags']
      },
      example_data: {
        sample_rows: [
          {
            report_date: '2024-01-15',
            title: 'Annual Physical Examination',
            physician_name: 'Dr. Sarah Smith',
            facility_name: 'City Medical Center',
            report_type: 'general',
            description: 'Routine annual physical examination with basic vitals and health assessment',
            tags: 'annual,physical,routine'
          },
          {
            report_date: '2024-01-20',
            title: 'Blood Test Results',
            physician_name: 'Dr. Michael Johnson',
            facility_name: 'LabCorp',
            report_type: 'lab',
            description: 'Comprehensive metabolic panel and lipid profile results',
            tags: 'blood,lab,cholesterol'
          }
        ]
      }
    },
    lab_results: {
      name: 'Lab Results Template',
      description: 'Template for importing laboratory test results',
      file_type: format,
      template_data: {
        headers: ['test_date', 'test_name', 'result_value', 'reference_range', 'units', 'status', 'physician_name', 'lab_name']
      },
      example_data: {
        sample_rows: [
          {
            test_date: '2024-01-10',
            test_name: 'Total Cholesterol',
            result_value: '180',
            reference_range: '<200',
            units: 'mg/dL',
            status: 'Normal',
            physician_name: 'Dr. Johnson',
            lab_name: 'LabCorp'
          },
          {
            test_date: '2024-01-10',
            test_name: 'Glucose',
            result_value: '95',
            reference_range: '70-100',
            units: 'mg/dL',
            status: 'Normal',
            physician_name: 'Dr. Johnson',
            lab_name: 'LabCorp'
          }
        ]
      }
    },
    prescriptions: {
      name: 'Prescriptions Template',
      description: 'Template for importing prescription records',
      file_type: format,
      template_data: {
        headers: ['prescription_date', 'medication_name', 'dosage', 'frequency', 'duration', 'physician_name', 'pharmacy_name', 'notes']
      },
      example_data: {
        sample_rows: [
          {
            prescription_date: '2024-01-15',
            medication_name: 'Lisinopril',
            dosage: '10mg',
            frequency: 'Once daily',
            duration: '30 days',
            physician_name: 'Dr. Smith',
            pharmacy_name: 'CVS Pharmacy',
            notes: 'Take with food'
          }
        ]
      }
    }
  };

  return templates[type] || templates.medical_records;
}

function generateCSVTemplate(template: any): { content: string; filename: string } {
  const headers = template.template_data.headers || [];
  const sampleData = template.example_data?.sample_rows || [];
  
  let content = headers.join(',') + '\n';
  
  // Add sample rows
  sampleData.forEach(row => {
    const values = headers.map(header => {
      let value = row[header] || '';
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    content += values.join(',') + '\n';
  });
  
  // Add a few empty rows for user input
  for (let i = 0; i < 3; i++) {
    content += headers.map(() => '').join(',') + '\n';
  }
  
  const filename = `${template.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_template.csv`;
  
  return { content, filename };
}

function generateJSONTemplate(template: any): { content: string; filename: string } {
  const sampleData = template.example_data || {};
  
  let content;
  if (template.name.includes('Lab Results')) {
    content = {
      reports: [
        {
          report_date: "2024-01-15",
          title: "Lab Results",
          type: "lab",
          tests: [
            {
              test_name: "Total Cholesterol",
              result_value: "180",
              reference_range: "<200",
              units: "mg/dL",
              status: "Normal"
            },
            {
              test_name: "Glucose",
              result_value: "95",
              reference_range: "70-100",
              units: "mg/dL",
              status: "Normal"
            }
          ],
          physician_name: "Dr. Johnson",
          facility_name: "LabCorp"
        }
      ]
    };
  } else {
    content = {
      reports: sampleData.sample_rows || [
        {
          report_date: "2024-01-15",
          title: "Sample Medical Record",
          physician_name: "Dr. Sample",
          facility_name: "Sample Medical Center",
          report_type: "general",
          description: "Sample description",
          tags: ["sample", "template"]
        }
      ]
    };
  }
  
  const filename = `${template.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_template.json`;
  
  return { 
    content: JSON.stringify(content, null, 2), 
    filename 
  };
}