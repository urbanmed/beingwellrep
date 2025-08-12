import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportRequest {
  importJobId: string;
  fileContent: string;
  fileName: string;
  fileType: string;
}

interface ParsedRecord {
  report_date: string;
  title: string;
  physician_name?: string;
  facility_name?: string;
  report_type?: string;
  description?: string;
  tags?: string[];
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

    const { importJobId, fileContent, fileName, fileType }: ImportRequest = await req.json();
    
    console.log(`Processing import job: ${importJobId}, file: ${fileName}, type: ${fileType}`);

    // Update job status to processing
    await supabaseClient
      .from('import_jobs')
      .update({ 
        status: 'processing',
        progress_percentage: 10,
        updated_at: new Date().toISOString()
      })
      .eq('id', importJobId);

    let parsedRecords: ParsedRecord[] = [];
    let validationResults = { errors: [], warnings: [], validRecords: 0 };

    // Parse file content based on type
    if (fileType === 'csv' || fileName.endsWith('.csv')) {
      parsedRecords = parseCSV(fileContent);
    } else if (fileType === 'json' || fileName.endsWith('.json')) {
      parsedRecords = parseJSON(fileContent);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    // Update progress
    await supabaseClient
      .from('import_jobs')
      .update({ progress_percentage: 30 })
      .eq('id', importJobId);

    // Validate records
    validationResults = validateRecords(parsedRecords);

    // Update progress
    await supabaseClient
      .from('import_jobs')
      .update({ 
        progress_percentage: 50,
        validation_results: validationResults
      })
      .eq('id', importJobId);

    // Get user ID from import job
    const { data: jobData } = await supabaseClient
      .from('import_jobs')
      .select('user_id')
      .eq('id', importJobId)
      .single();

    if (!jobData) {
      throw new Error('Import job not found');
    }

    // Import valid records
    let importedCount = 0;
    const validRecords = parsedRecords.filter((_, index) => 
      !validationResults.errors.some(error => error.row === index + 1)
    );

    for (let i = 0; i < validRecords.length; i++) {
      const record = validRecords[i];
      
      try {
        // Convert tags string to array if needed
        let tags = [];
        if (record.tags) {
          if (typeof record.tags === 'string') {
            tags = record.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
          } else if (Array.isArray(record.tags)) {
            tags = record.tags;
          }
        }

        // Insert into reports table
        const { error: insertError } = await supabaseClient
          .from('reports')
          .insert({
            user_id: jobData.user_id,
            title: record.title,
            report_date: record.report_date,
            physician_name: record.physician_name || null,
            facility_name: record.facility_name || null,
            report_type: record.report_type || 'general',
            description: record.description || null,
            tags: tags,
            parsing_status: 'completed',
            file_name: `imported_${fileName}`,
            file_type: 'imported'
          });

        if (!insertError) {
          importedCount++;
        } else {
          console.error('Error inserting record:', insertError);
          validationResults.errors.push({
            row: i + 1,
            field: 'general',
            message: `Failed to import: ${insertError.message}`
          });
        }

        // Update progress
        const progress = 50 + Math.round((i / validRecords.length) * 40);
        await supabaseClient
          .from('import_jobs')
          .update({ progress_percentage: progress })
          .eq('id', importJobId);

      } catch (error) {
        console.error('Error processing record:', error);
        validationResults.errors.push({
          row: i + 1,
          field: 'general',
          message: `Processing error: ${error.message}`
        });
      }
    }

    // Final update
    await supabaseClient
      .from('import_jobs')
      .update({
        status: 'completed',
        progress_percentage: 100,
        imported_record_count: importedCount,
        validation_results: validationResults,
        completed_at: new Date().toISOString(),
        error_log: validationResults.errors
      })
      .eq('id', importJobId);

    console.log(`Import completed: ${importedCount} records imported`);

    return new Response(JSON.stringify({
      success: true,
      importedCount,
      validationResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Import processing error:', error);
    
    // Update job status to failed if we have the ID
    try {
      const { importJobId } = await req.json();
      if (importJobId) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        await supabaseClient
          .from('import_jobs')
          .update({
            status: 'failed',
            error_log: [{ message: error.message, timestamp: new Date().toISOString() }]
          })
          .eq('id', importJobId);
      }
    } catch (updateError) {
      console.error('Failed to update job status:', updateError);
    }

    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function parseCSV(content: string): ParsedRecord[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const records: ParsedRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record: any = {};
    
    headers.forEach((header, index) => {
      const value = values[index]?.trim().replace(/"/g, '') || '';
      
      // Map common header variations
      const normalizedHeader = normalizeHeader(header);
      if (normalizedHeader) {
        record[normalizedHeader] = value;
      }
    });

    if (record.title || record.report_date) {
      records.push(record as ParsedRecord);
    }
  }

  return records;
}

function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

function parseJSON(content: string): ParsedRecord[] {
  try {
    const data = JSON.parse(content);
    
    // Handle different JSON structures
    if (Array.isArray(data)) {
      return data.map(item => validateRecord(item));
    } else if (data.reports && Array.isArray(data.reports)) {
      return data.reports.map(item => validateRecord(item));
    } else if (data.records && Array.isArray(data.records)) {
      return data.records.map(item => validateRecord(item));
    } else {
      return [validateRecord(data)];
    }
  } catch (error) {
    throw new Error(`Invalid JSON format: ${error.message}`);
  }
}

function validateRecord(item: any): ParsedRecord {
  return {
    report_date: item.report_date || item.date || item.test_date || '',
    title: item.title || item.name || item.test_name || '',
    physician_name: item.physician_name || item.doctor || item.physician || '',
    facility_name: item.facility_name || item.facility || item.lab_name || '',
    report_type: item.report_type || item.type || 'general',
    description: item.description || item.notes || item.result || '',
    tags: item.tags || []
  };
}

function normalizeHeader(header: string): string | null {
  const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  const mappings: { [key: string]: string } = {
    'date': 'report_date',
    'test_date': 'report_date',
    'report_date': 'report_date',
    'title': 'title',
    'name': 'title',
    'test_name': 'title',
    'physician': 'physician_name',
    'doctor': 'physician_name',
    'physician_name': 'physician_name',
    'facility': 'facility_name',
    'facility_name': 'facility_name',
    'lab_name': 'facility_name',
    'type': 'report_type',
    'report_type': 'report_type',
    'description': 'description',
    'notes': 'description',
    'result': 'description',
    'tags': 'tags'
  };

  return mappings[normalized] || null;
}

function validateRecords(records: ParsedRecord[]): any {
  const errors = [];
  const warnings = [];
  let validRecords = 0;

  records.forEach((record, index) => {
    const rowNum = index + 1;
    
    // Required field validation
    if (!record.title || record.title.trim() === '') {
      errors.push({
        row: rowNum,
        field: 'title',
        message: 'Title is required'
      });
    }
    
    if (!record.report_date || record.report_date.trim() === '') {
      errors.push({
        row: rowNum,
        field: 'report_date',
        message: 'Report date is required'
      });
    } else {
      // Date format validation
      const dateFormats = [
        /^\d{4}-\d{2}-\d{2}$/,  // YYYY-MM-DD
        /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
        /^\d{2}-\d{2}-\d{4}$/   // MM-DD-YYYY
      ];
      
      const isValidDate = dateFormats.some(format => format.test(record.report_date));
      if (!isValidDate) {
        errors.push({
          row: rowNum,
          field: 'report_date',
          message: 'Invalid date format. Use YYYY-MM-DD, MM/DD/YYYY, or MM-DD-YYYY'
        });
      }
    }

    // Warning for missing optional fields
    if (!record.physician_name) {
      warnings.push({
        row: rowNum,
        field: 'physician_name',
        message: 'Physician name is missing'
      });
    }

    if (!record.facility_name) {
      warnings.push({
        row: rowNum,
        field: 'facility_name',
        message: 'Facility name is missing'
      });
    }

    // Count valid records (those without errors)
    const hasErrors = errors.some(error => error.row === rowNum);
    if (!hasErrors) {
      validRecords++;
    }
  });

  return {
    errors,
    warnings,
    validRecords,
    totalRecords: records.length,
    invalidRecords: records.length - validRecords
  };
}