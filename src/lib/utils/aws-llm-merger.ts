/**
 * Intelligent AWS + LLM Result Merger
 * Combines AWS Comprehend Medical entities with LLM contextual data
 */

interface AWSEntity {
  text: string;
  category: string;
  type: string;
  confidence: number;
  beginOffset?: number;
  endOffset?: number;
  attributes?: Array<{
    type: string;
    score: number;
    relationshipScore?: number;
    id?: number;
    beginOffset?: number;
    endOffset?: number;
    text?: string;
  }>;
  traits?: Array<{
    name: string;
    score: number;
  }>;
}

interface AWSRelationship {
  id: number;
  type: string;
  score: number;
}

interface StructuredData {
  tables?: Array<{
    headers: string[];
    rows: string[][];
    confidence?: number;
  }>;
  forms?: Array<{
    key: string;
    value: string;
    confidence?: number;
  }>;
  metadata?: any;
}

/**
 * Merges AWS Comprehend Medical entities with LLM parsed data
 * Prioritizes AWS medical entities while preserving LLM context
 */
export function mergeAWSAndLLMResults(
  awsEntities: AWSEntity[],
  awsRelationships: AWSRelationship[],
  llmData: any,
  structuredData: StructuredData | null = null
): any {
  console.log('🔀 Starting intelligent AWS+LLM result merging...');
  
  const merged = {
    ...llmData,
    hybrid: true,
    awsEntitiesCount: awsEntities.length,
    awsRelationshipsCount: awsRelationships.length,
    processingPipeline: ['aws_textract', 'aws_comprehend_medical', 'terminology_validation', 'llm_enhancement'],
    confidence: calculateHybridConfidence(awsEntities, llmData)
  };

  // Extract and categorize AWS entities
  const categorizedEntities = categorizeAWSEntities(awsEntities);
  
  // Merge based on report type
  const reportType = llmData?.reportType?.toLowerCase() || 'general';
  
  switch (reportType) {
    case 'lab':
    case 'lab_results':
      return mergeLabResults(merged, categorizedEntities, structuredData, llmData);
      
    case 'prescription':
    case 'pharmacy':
      return mergePrescriptions(merged, categorizedEntities, llmData);
      
    case 'vitals':
    case 'vital_signs':
      return mergeVitals(merged, categorizedEntities, llmData);
      
    default:
      return mergeGeneral(merged, categorizedEntities, llmData);
  }
}

function categorizeAWSEntities(entities: AWSEntity[]) {
  const categorized = {
    medications: entities.filter(e => ['GENERIC_NAME', 'BRAND_NAME', 'MEDICATION'].includes(e.type)),
    conditions: entities.filter(e => ['DX_NAME', 'MEDICAL_CONDITION'].includes(e.type)),
    testNames: entities.filter(e => ['TEST_NAME', 'PROCEDURE_NAME'].includes(e.type)),
    testValues: entities.filter(e => ['TEST_VALUE', 'TEST_UNIT'].includes(e.type)),
    anatomy: entities.filter(e => e.category === 'ANATOMY'),
    dosages: entities.filter(e => ['DOSAGE', 'STRENGTH'].includes(e.type)),
    frequencies: entities.filter(e => ['FREQUENCY', 'DURATION'].includes(e.type)),
    providers: entities.filter(e => e.category === 'PROTECTED_HEALTH_INFORMATION' && e.type === 'NAME'),
    dates: entities.filter(e => e.type === 'DATE'),
    all: entities
  };
  
  console.log(`📊 Categorized ${entities.length} AWS entities:`, {
    medications: categorized.medications.length,
    conditions: categorized.conditions.length,
    testNames: categorized.testNames.length,
    testValues: categorized.testValues.length
  });
  
  return categorized;
}

function mergeLabResults(merged: any, categorized: any, structuredData: StructuredData | null, llmData: any) {
  console.log('🧪 Merging lab results with AWS entities...');
  
  // Start with LLM tests as base
  const tests = [...(llmData.tests || [])];
  
  // Enhance with AWS-extracted test data
  const awsTests = extractTestsFromAWSEntities(categorized);
  
  // Merge structured table data if available
  if (structuredData?.tables && structuredData.tables.length > 0) {
    const tableTests = extractTestsFromTables(structuredData.tables);
    tests.push(...tableTests);
  }
  
  // Add AWS tests, avoiding duplicates
  awsTests.forEach(awsTest => {
    const existingTest = tests.find(t => 
      t.name?.toLowerCase().includes(awsTest.name.toLowerCase()) ||
      awsTest.name.toLowerCase().includes(t.name?.toLowerCase() || '')
    );
    
    if (existingTest) {
      // Enhance existing test with AWS data
      existingTest.awsConfidence = awsTest.awsConfidence;
      existingTest.awsSource = true;
      if (!existingTest.value && awsTest.value) {
        existingTest.value = awsTest.value;
        existingTest.unit = awsTest.unit;
      }
    } else {
      // Add new test from AWS
      tests.push({
        ...awsTest,
        awsSource: true
      });
    }
  });
  
  merged.tests = tests;
  merged.awsEnhanced = true;
  
  console.log(`✅ Lab merge complete: ${tests.length} total tests, ${awsTests.length} from AWS`);
  return merged;
}

function mergePrescriptions(merged: any, categorized: any, llmData: any) {
  console.log('💊 Merging prescriptions with AWS entities...');
  
  const medications = [...(llmData.medications || [])];
  
  // Extract medications from AWS entities
  categorized.medications.forEach(med => {
    const existingMed = medications.find(m => 
      m.name?.toLowerCase().includes(med.text.toLowerCase()) ||
      med.text.toLowerCase().includes(m.name?.toLowerCase() || '')
    );
    
    if (existingMed) {
      existingMed.awsConfidence = med.confidence;
      existingMed.awsSource = true;
    } else {
      // Create new medication from AWS
      const dosage = categorized.dosages.find(d => Math.abs(d.beginOffset - med.beginOffset) < 50);
      const frequency = categorized.frequencies.find(f => Math.abs(f.beginOffset - med.beginOffset) < 100);
      
      medications.push({
        name: med.text,
        dosage: dosage?.text || '',
        frequency: frequency?.text || '',
        awsSource: true,
        awsConfidence: med.confidence
      });
    }
  });
  
  merged.medications = medications;
  merged.awsEnhanced = true;
  
  console.log(`✅ Prescription merge complete: ${medications.length} total medications`);
  return merged;
}

function mergeVitals(merged: any, categorized: any, llmData: any) {
  console.log('🩺 Merging vitals with AWS entities...');
  
  const vitals = [...(llmData.vitals || [])];
  
  // AWS doesn't typically extract vitals as structured data,
  // so we enhance existing LLM vitals with AWS confidence if found
  vitals.forEach(vital => {
    const relatedEntity = categorized.testValues.find(e => 
      e.text.includes(vital.value) || vital.value.includes(e.text)
    );
    
    if (relatedEntity) {
      vital.awsConfidence = relatedEntity.confidence;
      vital.awsSource = true;
    }
  });
  
  merged.vitals = vitals;
  merged.awsEnhanced = true;
  
  console.log(`✅ Vitals merge complete: ${vitals.length} total vitals`);
  return merged;
}

function mergeGeneral(merged: any, categorized: any, llmData: any) {
  console.log('📋 Merging general medical data with AWS entities...');
  
  // Add AWS entities as additional context
  merged.awsEntities = {
    medications: categorized.medications.map(e => ({ name: e.text, confidence: e.confidence })),
    conditions: categorized.conditions.map(e => ({ name: e.text, confidence: e.confidence })),
    procedures: categorized.testNames.map(e => ({ name: e.text, confidence: e.confidence })),
    providers: categorized.providers.map(e => ({ name: e.text, confidence: e.confidence }))
  };
  
  merged.awsEnhanced = true;
  
  console.log(`✅ General merge complete with ${categorized.all.length} AWS entities`);
  return merged;
}

function extractTestsFromAWSEntities(categorized: any): any[] {
  const tests: any[] = [];
  
  // Match test names with test values
  categorized.testNames.forEach(testName => {
    const nearbyValues = categorized.testValues.filter(val => 
      Math.abs((val.beginOffset || 0) - (testName.beginOffset || 0)) < 200
    );
    
    nearbyValues.forEach(val => {
      const unit = categorized.all.find(e => 
        e.type === 'TEST_UNIT' && 
        Math.abs((e.beginOffset || 0) - (val.beginOffset || 0)) < 50
      );
      
      tests.push({
        name: testName.text,
        value: val.text,
        unit: unit?.text || '',
        awsConfidence: (testName.confidence + val.confidence) / 2,
        status: determineTestStatus(val.text, '')
      });
    });
  });
  
  return tests;
}

function extractTestsFromTables(tables: any[]): any[] {
  const tests: any[] = [];
  
  tables.forEach(table => {
    if (table.headers && table.rows) {
      // Look for common lab table patterns
      const nameIndex = table.headers.findIndex(h => 
        h.toLowerCase().includes('test') || 
        h.toLowerCase().includes('parameter') ||
        h.toLowerCase().includes('name')
      );
      
      const valueIndex = table.headers.findIndex(h => 
        h.toLowerCase().includes('result') ||
        h.toLowerCase().includes('value') ||
        h.toLowerCase().includes('level')
      );
      
      const unitIndex = table.headers.findIndex(h => 
        h.toLowerCase().includes('unit') ||
        h.toLowerCase().includes('reference')
      );
      
      if (nameIndex >= 0 && valueIndex >= 0) {
        table.rows.forEach(row => {
          if (row[nameIndex] && row[valueIndex]) {
            tests.push({
              name: row[nameIndex],
              value: row[valueIndex],
              unit: unitIndex >= 0 ? row[unitIndex] : '',
              source: 'table_extraction',
              confidence: table.confidence || 0.9
            });
          }
        });
      }
    }
  });
  
  return tests;
}

function calculateHybridConfidence(awsEntities: AWSEntity[], llmData: any): number {
  if (awsEntities.length === 0) {
    return llmData?.confidence || 0.8;
  }
  
  const awsConfidence = awsEntities.reduce((sum, e) => sum + e.confidence, 0) / awsEntities.length;
  const llmConfidence = llmData?.confidence || 0.8;
  
  // Weight AWS confidence higher due to medical specialization
  return (awsConfidence * 0.7) + (llmConfidence * 0.3);
}

function determineTestStatus(value: string, referenceRange: string): string {
  // Basic status determination - can be enhanced
  const numValue = parseFloat(value.replace(/[^\d.-]/g, ''));
  if (isNaN(numValue)) return 'normal';
  
  // This would need more sophisticated logic based on medical ranges
  return 'normal';
}