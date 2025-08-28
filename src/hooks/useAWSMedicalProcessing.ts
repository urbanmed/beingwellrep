import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  EnhancedDocumentParsingResult,
  AWSMedicalEntity,
  TextractTable,
  TextractForm,
  ValidatedMedicalEntity
} from '@/types/aws-medical-data';

export const useAWSMedicalProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Stage 1: Enhanced OCR with AWS Textract
  const processWithTextract = async (filePath: string) => {
    console.log('Starting Textract processing for:', filePath);
    
    const { data, error } = await supabase.functions.invoke('aws-textract-document', {
      body: { filePath }
    });

    if (error) {
      console.error('Textract processing error:', error);
      throw new Error(`Textract processing failed: ${error.message}`);
    }

    console.log('Textract processing completed successfully');
    return data;
  };

  // Stage 2: Medical entity extraction with AWS Comprehend Medical
  const processWithComprehendMedical = async (text: string) => {
    console.log('Starting Comprehend Medical processing...');
    
    const { data, error } = await supabase.functions.invoke('aws-comprehend-medical', {
      body: { text }
    });

    if (error) {
      console.error('Comprehend Medical processing error:', error);
      throw new Error(`Comprehend Medical processing failed: ${error.message}`);
    }

    console.log(`Comprehend Medical found ${data.entities.length} entities and ${data.relationships.length} relationships`);
    return data;
  };

  // Stage 3: Medical terminology validation
  const validateMedicalTerminology = async (entities: AWSMedicalEntity[]) => {
    console.log('Starting medical terminology validation...');
    
    const { data, error } = await supabase.functions.invoke('validate-medical-terminology', {
      body: { 
        entities: entities.map(e => ({
          text: e.text,
          category: e.category,
          type: e.type
        }))
      }
    });

    if (error) {
      console.error('Medical terminology validation error:', error);
      throw new Error(`Terminology validation failed: ${error.message}`);
    }

    console.log(`Terminology validation completed: ${data.summary.validationRate * 100}% validation rate`);
    return data;
  };

  // Combine Textract tables into structured lab data
  const extractLabDataFromTables = (tables: TextractTable[]) => {
    const labResults: Array<{
      name: string;
      value: string;
      unit?: string;
      referenceRange?: string;
      confidence: number;
    }> = [];

    tables.forEach(table => {
      // Find header row to identify columns
      const headerCells = table.cells.filter(cell => cell.rowIndex === 0);
      const testNameCol = headerCells.findIndex(cell => 
        cell.text.toLowerCase().includes('test') || 
        cell.text.toLowerCase().includes('name') ||
        cell.text.toLowerCase().includes('parameter')
      );
      const valueCol = headerCells.findIndex(cell => 
        cell.text.toLowerCase().includes('result') || 
        cell.text.toLowerCase().includes('value')
      );
      const rangeCol = headerCells.findIndex(cell => 
        cell.text.toLowerCase().includes('range') || 
        cell.text.toLowerCase().includes('reference')
      );

      // Extract data rows
      const maxRow = Math.max(...table.cells.map(cell => cell.rowIndex));
      for (let row = 1; row <= maxRow; row++) {
        const rowCells = table.cells.filter(cell => cell.rowIndex === row);
        
        const testName = testNameCol >= 0 ? rowCells.find(cell => cell.columnIndex === testNameCol)?.text : '';
        const value = valueCol >= 0 ? rowCells.find(cell => cell.columnIndex === valueCol)?.text : '';
        const range = rangeCol >= 0 ? rowCells.find(cell => cell.columnIndex === rangeCol)?.text : '';
        
        if (testName && value) {
          // Extract unit from value if present
          const valueMatch = value.match(/^([0-9.,]+)\s*([a-zA-Z/]+)?/);
          const numericValue = valueMatch?.[1] || value;
          const unit = valueMatch?.[2];
          
          labResults.push({
            name: testName,
            value: numericValue,
            unit,
            referenceRange: range,
            confidence: Math.min(
              rowCells.find(cell => cell.columnIndex === testNameCol)?.confidence || 0.8,
              rowCells.find(cell => cell.columnIndex === valueCol)?.confidence || 0.8
            )
          });
        }
      }
    });

    return labResults;
  };

  // Extract patient info from forms
  const extractPatientInfoFromForms = (forms: TextractForm[]) => {
    const patientInfo: any = {};
    
    forms.forEach(form => {
      const key = form.key.toLowerCase();
      if (key.includes('patient') && key.includes('name')) {
        patientInfo.name = form.value;
      } else if (key.includes('dob') || key.includes('birth')) {
        patientInfo.dateOfBirth = form.value;
      } else if (key.includes('mrn') || key.includes('id')) {
        patientInfo.id = form.value;
      }
    });

    return patientInfo;
  };

  // Main processing function that orchestrates all AWS services
  const processDocumentWithAWS = async (filePath: string): Promise<EnhancedDocumentParsingResult> => {
    setIsProcessing(true);
    const startTime = Date.now();

    try {
      console.log('Starting AWS medical document processing pipeline...');

      // Stage 1: Textract OCR
      console.log('Stage 1: Processing with Textract...');
      const textractResult = await processWithTextract(filePath);

      // Stage 2: Comprehend Medical entity extraction
      console.log('Stage 2: Processing with Comprehend Medical...');
      const comprehendResult = await processWithComprehendMedical(textractResult.extractedText);

      // Stage 3: Medical terminology validation
      console.log('Stage 3: Validating medical terminology...');
      const terminologyResult = await validateMedicalTerminology(comprehendResult.entities);

      // Combine validated entities with original entity data
      const validatedEntities: ValidatedMedicalEntity[] = comprehendResult.entities.map((entity: AWSMedicalEntity, index: number) => {
        const validation = terminologyResult.validations[index];
        return {
          ...entity,
          normalizedText: validation?.normalizedText || entity.text,
          codes: validation?.codes || {},
          validationConfidence: validation?.confidence || 0,
          isValid: validation?.isValid || false,
          suggestions: validation?.suggestions
        };
      });

      // Extract structured data based on document type
      const labData = extractLabDataFromTables(textractResult.tables || []);
      const patientInfo = extractPatientInfoFromForms(textractResult.forms || []);

      // Calculate overall confidence
      const overallConfidence = (
        (textractResult.confidence || 0) * 0.3 +
        (comprehendResult.metadata.confidence || 0) * 0.4 +
        (terminologyResult.summary.validationRate || 0) * 0.3
      );

      // Create enhanced medical data structure
      const enhancedData = {
        medicalEntities: validatedEntities,
        medicalRelationships: comprehendResult.relationships,
        extractedText: textractResult.extractedText,
        tables: textractResult.tables || [],
        forms: textractResult.forms || [],
        layout: textractResult.layout,
        confidence: {
          textract: textractResult.confidence || 0,
          comprehendMedical: comprehendResult.metadata.confidence || 0,
          terminology: terminologyResult.summary.validationRate || 0,
          overall: overallConfidence
        },
        standardizedCodes: terminologyResult.validations.map(v => v.codes),
        processingStages: {
          textract: { completed: true, processingTime: textractResult.metadata.processingTime },
          comprehendMedical: { completed: true, processingTime: comprehendResult.metadata.processingTime },
          terminology: { completed: true, processingTime: terminologyResult.summary.processingTime },
          llmEnhancement: { completed: false, processingTime: 0 }
        },
        quality: {
          completeness: Math.min(labData.length / 5, 1), // Assume 5 tests for full completeness
          consistency: terminologyResult.summary.validationRate,
          accuracy: overallConfidence,
          medicalValidity: validatedEntities.filter(e => e.isValid).length / Math.max(validatedEntities.length, 1)
        },
        extractedAt: new Date().toISOString()
      };

      const processingTime = Date.now() - startTime;

      const result: EnhancedDocumentParsingResult = {
        success: true,
        data: {
          reportType: 'lab', // TODO: Determine type based on content
          ...enhancedData,
          patient: patientInfo,
          tests: labData
        } as any,
        extractedText: textractResult.extractedText,
        confidence: overallConfidence,
        model: 'AWS Hybrid Pipeline (Textract + Comprehend Medical)',
        processingTime,
        awsResults: {
          textract: textractResult,
          comprehendMedical: comprehendResult,
          terminology: terminologyResult
        },
        pipeline: {
          stage1_textract: 'completed',
          stage2_comprehend: 'completed',
          stage3_llm: 'pending',
          stage4_validation: 'completed'
        }
      };

      console.log(`AWS medical processing completed successfully in ${processingTime}ms`);
      console.log(`Overall confidence: ${(overallConfidence * 100).toFixed(1)}%`);
      console.log(`Found ${validatedEntities.length} medical entities, ${validatedEntities.filter(e => e.isValid).length} validated`);

      toast({
        title: "AWS Medical Processing Complete",
        description: `Document processed with ${(overallConfidence * 100).toFixed(1)}% confidence. Found ${validatedEntities.length} medical entities.`,
      });

      return result;

    } catch (error) {
      console.error('AWS medical processing error:', error);
      
      const result: EnhancedDocumentParsingResult = {
        success: false,
        confidence: 0,
        model: 'AWS Hybrid Pipeline (Failed)',
        processingTime: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        pipeline: {
          stage1_textract: 'failed',
          stage2_comprehend: 'failed',
          stage3_llm: 'pending',
          stage4_validation: 'failed'
        }
      };

      toast({
        title: "AWS Processing Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });

      return result;

    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processDocumentWithAWS,
    processWithTextract,
    processWithComprehendMedical,
    validateMedicalTerminology,
    isProcessing
  };
};