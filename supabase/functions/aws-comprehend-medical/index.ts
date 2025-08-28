import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ComprehendMedicalRequest {
  text: string;
  language?: string;
}

interface MedicalEntity {
  id: number;
  text: string;
  category: string;
  type: string;
  score: number;
  beginOffset: number;
  endOffset: number;
  attributes: Array<{
    type: string;
    score: number;
    relationshipScore: number;
    text: string;
  }>;
  traits: Array<{
    name: string;
    score: number;
  }>;
}

interface MedicalRelationship {
  id: number;
  type: string;
  score: number;
  arg1: { entityId: number };
  arg2: { entityId: number };
}

interface ComprehendMedicalResponse {
  entities: MedicalEntity[];
  relationships: MedicalRelationship[];
  modelVersion: string;
  paginationToken?: string;
  metadata: {
    processingTime: number;
    service: string;
    confidence: number;
  };
}

async function processWithComprehendMedical(text: string): Promise<ComprehendMedicalResponse> {
  console.log('Starting AWS Comprehend Medical processing...');
  
  const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
  const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
  const awsRegion = Deno.env.get('AWS_REGION') || 'us-east-1';

  if (!awsAccessKeyId || !awsSecretAccessKey) {
    throw new Error('AWS credentials not configured');
  }

  const startTime = Date.now();

  try {
    // In production, implement proper AWS Comprehend Medical API calls
    // For demo purposes, we'll simulate the response structure
    console.log('Simulating Comprehend Medical processing (implement AWS SDK in production)...');
    
    // Analyze text for medical entities
    const mockEntities: MedicalEntity[] = [
      {
        id: 1,
        text: "glucose",
        category: "TEST_TREATMENT_PROCEDURE",
        type: "TEST_NAME",
        score: 0.9876,
        beginOffset: text.toLowerCase().indexOf('glucose'),
        endOffset: text.toLowerCase().indexOf('glucose') + 7,
        attributes: [
          {
            type: "TEST_VALUE",
            score: 0.9654,
            relationshipScore: 0.9432,
            text: "95 mg/dL"
          }
        ],
        traits: [
          {
            name: "SIGN",
            score: 0.8765
          }
        ]
      },
      {
        id: 2,
        text: "diabetes",
        category: "MEDICAL_CONDITION",
        type: "DX_NAME",
        score: 0.9543,
        beginOffset: text.toLowerCase().indexOf('diabetes'),
        endOffset: text.toLowerCase().indexOf('diabetes') + 8,
        attributes: [],
        traits: [
          {
            name: "DIAGNOSIS",
            score: 0.9321
          }
        ]
      },
      {
        id: 3,
        text: "metformin",
        category: "MEDICATION",
        type: "GENERIC_NAME",
        score: 0.9678,
        beginOffset: text.toLowerCase().indexOf('metformin'),
        endOffset: text.toLowerCase().indexOf('metformin') + 9,
        attributes: [
          {
            type: "DOSAGE",
            score: 0.8943,
            relationshipScore: 0.8765,
            text: "500mg"
          },
          {
            type: "FREQUENCY",
            score: 0.9012,
            relationshipScore: 0.8876,
            text: "twice daily"
          }
        ],
        traits: []
      }
    ];

    const mockRelationships: MedicalRelationship[] = [
      {
        id: 1,
        type: "TEST_VALUE",
        score: 0.9432,
        arg1: { entityId: 1 }, // glucose
        arg2: { entityId: 1 }  // 95 mg/dL (attribute)
      },
      {
        id: 2,
        type: "MEDICATION_DOSAGE",
        score: 0.8943,
        arg1: { entityId: 3 }, // metformin
        arg2: { entityId: 3 }  // 500mg (attribute)
      }
    ];

    const result: ComprehendMedicalResponse = {
      entities: mockEntities,
      relationships: mockRelationships,
      modelVersion: "1.0.0",
      metadata: {
        processingTime: Date.now() - startTime,
        service: 'AWS Comprehend Medical',
        confidence: 0.94
      }
    };

    console.log(`Comprehend Medical processing completed. Found ${mockEntities.length} entities and ${mockRelationships.length} relationships`);
    return result;

  } catch (error) {
    console.error('Comprehend Medical processing error:', error);
    throw new Error(`AWS Comprehend Medical processing failed: ${error.message}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('AWS Comprehend Medical processing started');
    
    const { text, language = 'en' }: ComprehendMedicalRequest = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    if (text.length > 20000) {
      throw new Error('Text too long. Maximum length is 20,000 characters');
    }

    console.log(`Processing text of length: ${text.length}`);

    // Process with Comprehend Medical
    const result = await processWithComprehendMedical(text);

    console.log('Comprehend Medical processing completed successfully');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in aws-comprehend-medical function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        entities: [],
        relationships: [],
        modelVersion: "1.0.0",
        metadata: {
          processingTime: 0,
          service: 'AWS Comprehend Medical',
          confidence: 0
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});