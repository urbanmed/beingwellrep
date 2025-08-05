import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, AlertCircle, CheckCircle, FileText, Calendar, Activity } from "lucide-react";
import { parseExtractedTextAsJSON, transformLabReportData, createFallbackDataStructure } from "@/lib/utils/extracted-text-parser-improved";
import { EnhancedPatientInfoCard } from "./EnhancedPatientInfoCard";
import { EnhancedProviderInfoCard } from "./EnhancedProviderInfoCard";
import { EnhancedFacilityInfoCard } from "./EnhancedFacilityInfoCard";
import { EnhancedTestResultsCard } from "./EnhancedTestResultsCard";
import { EnhancedMedicationCard } from "./EnhancedMedicationCard";
import { 
  ParsedMedicalData, 
  LabResultData, 
  PrescriptionData, 
  RadiologyData, 
  VitalSignsData, 
  GeneralMedicalData 
} from "@/types/medical-data";

interface DocumentViewerProps {
  report: {
    id: string;
    title: string;
    report_type: string;
    parsing_status: string;
    parsed_data: any;
    extraction_confidence: number | null;
    parsing_confidence: number | null;
    extracted_text: string | null;
    file_url: string | null;
    physician_name: string | null;
    facility_name: string | null;
    report_date: string;
  };
}

export function DocumentViewer({ report }: DocumentViewerProps) {
  const handleViewOriginal = () => {
    if (report.file_url) {
      window.open(report.file_url, '_blank');
    }
  };

  // Enhanced function to get structured data from the report
  const getStructuredData = (): ParsedMedicalData | null => {
    console.log('Getting structured data for report:', report.id);
    
    // First, try to get data from parsed_data
    if (report.parsed_data) {
      console.log('Using parsed_data:', report.parsed_data);
      
      // Check if it's already in the correct enhanced format
      if (report.parsed_data.reportType && report.parsed_data.patient) {
        return report.parsed_data as ParsedMedicalData;
      }
      
      // Check for rawResponse in parsed_data (common structure from edge function)
      if (report.parsed_data.rawResponse) {
        console.log('Attempting to parse rawResponse');
        try {
          // Clean and parse the rawResponse
          let cleanResponse = report.parsed_data.rawResponse;
          if (typeof cleanResponse === 'string') {
            // Remove markdown formatting
            cleanResponse = cleanResponse.replace(/```json\s*|\s*```/g, '');
            cleanResponse = cleanResponse.replace(/```\s*|\s*```/g, '');
            
            const parsed = JSON.parse(cleanResponse);
            if (parsed.reportType) {
              return parsed as ParsedMedicalData;
            }
          }
        } catch (error) {
          console.error('Failed to parse rawResponse:', error);
        }
      }
      
      // Try to transform existing data for lab reports
      if (report.report_type === 'lab') {
        const transformed = transformLabReportData(report.parsed_data);
        if (transformed) {
          return transformed as ParsedMedicalData;
        }
      }
    }

    // If no parsed_data, try to extract from extracted_text
    if (report.extracted_text) {
      console.log('Attempting to parse extracted_text as JSON');
      const parsedFromText = parseExtractedTextAsJSON(report.extracted_text);
      
      if (parsedFromText && parsedFromText.reportType) {
        return parsedFromText as ParsedMedicalData;
      }
      
      // Create fallback structure with enhanced types
      const fallback = createFallbackDataStructure({
        reportType: report.report_type || 'general',
        extractedText: report.extracted_text
      });
      
      if (fallback) {
        return {
          reportType: report.report_type || 'general',
          confidence: 25,
          extractedAt: new Date().toISOString(),
          patient: fallback.patient,
          provider: fallback.provider,
          facility: fallback.facility,
          notes: fallback.notes || report.extracted_text
        } as ParsedMedicalData;
      }
    }

    return null;
  };

  // Enhanced function to render structured data based on report type
  const renderStructuredData = (data: ParsedMedicalData) => {
    if (!data) return null;

    const reportType = data.reportType;

    switch (reportType) {
      case 'lab':
        return renderLabData(data as LabResultData);
      case 'prescription':
        return renderPrescriptionData(data as PrescriptionData);
      case 'radiology':
        return renderRadiologyData(data as RadiologyData);
      case 'vitals':
        return renderVitalsData(data as VitalSignsData);
      default:
        return renderGeneralData(data as GeneralMedicalData);
    }
  };

  // Enhanced lab data rendering
  const renderLabData = (data: LabResultData) => (
    <div className="space-y-6">
      <EnhancedPatientInfoCard patient={data.patient} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EnhancedProviderInfoCard 
          provider={data.orderingProvider} 
          title="Ordering Physician"
        />
        <EnhancedFacilityInfoCard facility={data.facility} />
      </div>

      {data.performingProvider && (
        <EnhancedProviderInfoCard 
          provider={data.performingProvider} 
          title="Performing Laboratory"
        />
      )}

      <EnhancedTestResultsCard 
        testPanels={data.testPanels}
        tests={data.tests}
      />

      {(data.collectionDate || data.receivedDate || data.reportDate || data.accessionNumber || data.specimenType) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Lab Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {data.collectionDate && (
              <div>
                <span className="text-muted-foreground">Collection Date:</span>
                <div className="font-medium">
                  {new Date(data.collectionDate).toLocaleString()}
                </div>
              </div>
            )}
            {data.receivedDate && (
              <div>
                <span className="text-muted-foreground">Received Date:</span>
                <div className="font-medium">
                  {new Date(data.receivedDate).toLocaleString()}
                </div>
              </div>
            )}
            {data.reportDate && (
              <div>
                <span className="text-muted-foreground">Report Date:</span>
                <div className="font-medium">
                  {new Date(data.reportDate).toLocaleString()}
                </div>
              </div>
            )}
            {data.accessionNumber && (
              <div>
                <span className="text-muted-foreground">Accession Number:</span>
                <div className="font-medium font-mono">{data.accessionNumber}</div>
              </div>
            )}
            {data.specimenType && (
              <div>
                <span className="text-muted-foreground">Specimen Type:</span>
                <div className="font-medium">{data.specimenType}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {data.clinicalInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Clinical Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{data.clinicalInfo}</p>
          </CardContent>
        </Card>
      )}

      {data.comments && (
        <Card>
          <CardHeader>
            <CardTitle>Lab Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{data.comments}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Enhanced prescription data rendering
  const renderPrescriptionData = (data: PrescriptionData) => (
    <div className="space-y-6">
      <EnhancedPatientInfoCard patient={data.patient} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EnhancedProviderInfoCard 
          provider={data.prescribingProvider} 
          title="Prescribing Physician"
        />
        <EnhancedFacilityInfoCard facility={data.facility} />
      </div>

      <EnhancedMedicationCard medications={data.medications} />

      {(data.prescriptionDate || data.prescriptionNumber || data.dea) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Prescription Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {data.prescriptionDate && (
              <div>
                <span className="text-muted-foreground">Prescription Date:</span>
                <div className="font-medium">
                  {new Date(data.prescriptionDate).toLocaleDateString()}
                </div>
              </div>
            )}
            {data.prescriptionNumber && (
              <div>
                <span className="text-muted-foreground">Prescription Number:</span>
                <div className="font-medium font-mono">{data.prescriptionNumber}</div>
              </div>
            )}
            {data.dea && (
              <div>
                <span className="text-muted-foreground">DEA Number:</span>
                <div className="font-medium font-mono">{data.dea}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {data.diagnosis && data.diagnosis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Diagnosis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.diagnosis.map((diag, index) => (
                <div key={index} className="text-sm p-2 bg-muted/50 rounded">
                  {diag}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.clinicalNotes && (
        <Card>
          <CardHeader>
            <CardTitle>Clinical Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{data.clinicalNotes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Enhanced radiology data rendering
  const renderRadiologyData = (data: RadiologyData) => (
    <div className="space-y-6">
      <EnhancedPatientInfoCard patient={data.patient} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EnhancedProviderInfoCard 
          provider={data.orderingProvider} 
          title="Ordering Physician"
        />
        <EnhancedProviderInfoCard 
          provider={data.radiologist} 
          title="Radiologist"
        />
      </div>

      <EnhancedFacilityInfoCard facility={data.facility} />

      {data.technologist && (
        <EnhancedProviderInfoCard 
          provider={data.technologist} 
          title="Technologist"
        />
      )}

      {(data.studyDate || data.reportDate || data.accessionNumber) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Study Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {data.studyDate && (
              <div>
                <span className="text-muted-foreground">Study Date:</span>
                <div className="font-medium">
                  {new Date(data.studyDate).toLocaleString()}
                </div>
              </div>
            )}
            {data.reportDate && (
              <div>
                <span className="text-muted-foreground">Report Date:</span>
                <div className="font-medium">
                  {new Date(data.reportDate).toLocaleString()}
                </div>
              </div>
            )}
            {data.accessionNumber && (
              <div>
                <span className="text-muted-foreground">Accession Number:</span>
                <div className="font-medium font-mono">{data.accessionNumber}</div>
              </div>
            )}
            {data.studyType && (
              <div>
                <span className="text-muted-foreground">Study Type:</span>
                <div className="font-medium">{data.studyType}</div>
              </div>
            )}
            {data.modality && (
              <div>
                <span className="text-muted-foreground">Modality:</span>
                <div className="font-medium">{data.modality}</div>
              </div>
            )}
            {data.bodyPart && (
              <div>
                <span className="text-muted-foreground">Body Part:</span>
                <div className="font-medium">{data.bodyPart}</div>
              </div>
            )}
            {data.urgency && (
              <div>
                <span className="text-muted-foreground">Urgency:</span>
                <Badge variant={data.urgency === 'stat' ? 'destructive' : 'secondary'}>
                  {data.urgency}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {data.technique && (
        <Card>
          <CardHeader>
            <CardTitle>Technique</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{data.technique}</p>
          </CardContent>
        </Card>
      )}

      {data.contrast && (
        <Card>
          <CardHeader>
            <CardTitle>Contrast Information</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-muted-foreground">Contrast Used:</span>
              <Badge variant={data.contrast.used ? 'default' : 'secondary'}>
                {data.contrast.used ? 'Yes' : 'No'}
              </Badge>
            </div>
            {data.contrast.used && data.contrast.type && (
              <div>
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium ml-2">{data.contrast.type}</span>
              </div>
            )}
            {data.contrast.used && data.contrast.amount && (
              <div>
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium ml-2">{data.contrast.amount}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {data.clinicalHistory && (
        <Card>
          <CardHeader>
            <CardTitle>Clinical History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{data.clinicalHistory}</p>
          </CardContent>
        </Card>
      )}

      {data.findings && (
        <Card>
          <CardHeader>
            <CardTitle>Findings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{data.findings}</p>
          </CardContent>
        </Card>
      )}

      {data.impression && (
        <Card>
          <CardHeader>
            <CardTitle>Impression</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{data.impression}</p>
          </CardContent>
        </Card>
      )}

      {data.recommendations && data.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recommendations.map((rec, index) => (
                <div key={index} className="text-sm p-2 bg-muted/50 rounded">
                  {rec}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Enhanced vitals data rendering with improved card layout
  const renderVitalsData = (data: VitalSignsData) => (
    <div className="space-y-6">
      <EnhancedPatientInfoCard patient={data.patient} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EnhancedProviderInfoCard 
          provider={data.measuredBy} 
          title="Measured By"
        />
        <EnhancedFacilityInfoCard facility={data.facility} />
      </div>

      {data.measurementDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Measurement Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <span className="text-muted-foreground">Measurement Date:</span>
              <div className="font-medium">
                {new Date(data.measurementDate).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {data.vitals && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Vital Signs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.vitals.bloodPressure && (
                <div className="p-4 border rounded-lg bg-card">
                  <div className="font-medium text-foreground mb-2">Blood Pressure</div>
                  <div className="text-2xl font-bold text-primary">
                    {data.vitals.bloodPressure.systolic}/{data.vitals.bloodPressure.diastolic}
                  </div>
                  <div className="text-sm text-muted-foreground">{data.vitals.bloodPressure.unit}</div>
                  {data.vitals.bloodPressure.position && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Position: {data.vitals.bloodPressure.position}
                    </div>
                  )}
                  {data.vitals.bloodPressure.cuff && (
                    <div className="text-xs text-muted-foreground">
                      Cuff: {data.vitals.bloodPressure.cuff}
                    </div>
                  )}
                </div>
              )}
              
              {data.vitals.heartRate && (
                <div className="p-4 border rounded-lg bg-card">
                  <div className="font-medium text-foreground mb-2">Heart Rate</div>
                  <div className="text-2xl font-bold text-primary">
                    {data.vitals.heartRate.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{data.vitals.heartRate.unit}</div>
                  {data.vitals.heartRate.rhythm && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Rhythm: {data.vitals.heartRate.rhythm}
                    </div>
                  )}
                </div>
              )}
              
              {data.vitals.temperature && (
                <div className="p-4 border rounded-lg bg-card">
                  <div className="font-medium text-foreground mb-2">Temperature</div>
                  <div className="text-2xl font-bold text-primary">
                    {data.vitals.temperature.value}°{data.vitals.temperature.unit}
                  </div>
                  {data.vitals.temperature.method && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Method: {data.vitals.temperature.method}
                    </div>
                  )}
                </div>
              )}
              
              {data.vitals.respiratoryRate && (
                <div className="p-4 border rounded-lg bg-card">
                  <div className="font-medium text-foreground mb-2">Respiratory Rate</div>
                  <div className="text-2xl font-bold text-primary">
                    {data.vitals.respiratoryRate.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{data.vitals.respiratoryRate.unit}</div>
                  {data.vitals.respiratoryRate.effort && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Effort: {data.vitals.respiratoryRate.effort}
                    </div>
                  )}
                </div>
              )}
              
              {data.vitals.oxygenSaturation && (
                <div className="p-4 border rounded-lg bg-card">
                  <div className="font-medium text-foreground mb-2">Oxygen Saturation</div>
                  <div className="text-2xl font-bold text-primary">
                    {data.vitals.oxygenSaturation.value}{data.vitals.oxygenSaturation.unit}
                  </div>
                  {data.vitals.oxygenSaturation.roomAir !== undefined && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {data.vitals.oxygenSaturation.roomAir ? 'Room Air' : 'Supplemental O2'}
                    </div>
                  )}
                  {!data.vitals.oxygenSaturation.roomAir && data.vitals.oxygenSaturation.supplementalO2 && (
                    <div className="text-xs text-muted-foreground">
                      O2: {data.vitals.oxygenSaturation.supplementalO2}
                    </div>
                  )}
                </div>
              )}
              
              {data.vitals.weight && (
                <div className="p-4 border rounded-lg bg-card">
                  <div className="font-medium text-foreground mb-2">Weight</div>
                  <div className="text-2xl font-bold text-primary">
                    {data.vitals.weight.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{data.vitals.weight.unit}</div>
                  {data.vitals.weight.method && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Method: {data.vitals.weight.method}
                    </div>
                  )}
                </div>
              )}
              
              {data.vitals.height && (
                <div className="p-4 border rounded-lg bg-card">
                  <div className="font-medium text-foreground mb-2">Height</div>
                  <div className="text-2xl font-bold text-primary">
                    {data.vitals.height.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{data.vitals.height.unit}</div>
                </div>
              )}
              
              {data.vitals.bmi && (
                <div className="p-4 border rounded-lg bg-card">
                  <div className="font-medium text-foreground mb-2">BMI</div>
                  <div className="text-2xl font-bold text-primary">
                    {data.vitals.bmi.value}
                  </div>
                  {data.vitals.bmi.category && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {data.vitals.bmi.category}
                    </div>
                  )}
                </div>
              )}

              {data.vitals.painScale && (
                <div className="p-4 border rounded-lg bg-card">
                  <div className="font-medium text-foreground mb-2">Pain Scale</div>
                  <div className="text-2xl font-bold text-primary">
                    {data.vitals.painScale.value}/10
                  </div>
                  {data.vitals.painScale.scale && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Scale: {data.vitals.painScale.scale}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {data.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Measurement Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{data.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Enhanced general data rendering
  const renderGeneralData = (data: GeneralMedicalData) => (
    <div className="space-y-6">
      <EnhancedPatientInfoCard patient={data.patient} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EnhancedProviderInfoCard 
          provider={data.provider} 
          title="Healthcare Provider"
        />
        <EnhancedFacilityInfoCard facility={data.facility} />
      </div>

      {(data.documentDate || data.documentType || data.visitType) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Document Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {data.documentDate && (
              <div>
                <span className="text-muted-foreground">Document Date:</span>
                <div className="font-medium">
                  {new Date(data.documentDate).toLocaleDateString()}
                </div>
              </div>
            )}
            {data.documentType && (
              <div>
                <span className="text-muted-foreground">Document Type:</span>
                <div className="font-medium">{data.documentType}</div>
              </div>
            )}
            {data.visitType && (
              <div>
                <span className="text-muted-foreground">Visit Type:</span>
                <div className="font-medium">{data.visitType}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {data.chiefComplaint && (
        <Card>
          <CardHeader>
            <CardTitle>Chief Complaint</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{data.chiefComplaint}</p>
          </CardContent>
        </Card>
      )}

      {data.historyOfPresentIllness && (
        <Card>
          <CardHeader>
            <CardTitle>History of Present Illness</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{data.historyOfPresentIllness}</p>
          </CardContent>
        </Card>
      )}

      {data.pastMedicalHistory && (
        <Card>
          <CardHeader>
            <CardTitle>Past Medical History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{data.pastMedicalHistory}</p>
          </CardContent>
        </Card>
      )}

      {data.socialHistory && (
        <Card>
          <CardHeader>
            <CardTitle>Social History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{data.socialHistory}</p>
          </CardContent>
        </Card>
      )}

      {data.familyHistory && (
        <Card>
          <CardHeader>
            <CardTitle>Family History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{data.familyHistory}</p>
          </CardContent>
        </Card>
      )}

      {data.reviewOfSystems && (
        <Card>
          <CardHeader>
            <CardTitle>Review of Systems</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{data.reviewOfSystems}</p>
          </CardContent>
        </Card>
      )}

      {data.physicalExamination && (
        <Card>
          <CardHeader>
            <CardTitle>Physical Examination</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{data.physicalExamination}</p>
          </CardContent>
        </Card>
      )}

      {data.assessment && (
        <Card>
          <CardHeader>
            <CardTitle>Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{data.assessment}</p>
          </CardContent>
        </Card>
      )}

      {data.plan && (
        <Card>
          <CardHeader>
            <CardTitle>Treatment Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{data.plan}</p>
          </CardContent>
        </Card>
      )}

      {data.diagnosis && data.diagnosis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Diagnosis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.diagnosis.map((diag, index) => (
                <div key={index} className="p-3 border rounded-lg bg-card">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{diag.description}</div>
                    {diag.type && (
                      <Badge variant={diag.type === 'primary' ? 'default' : 'secondary'}>
                        {diag.type}
                      </Badge>
                    )}
                  </div>
                  {diag.code && (
                    <div className="text-sm text-muted-foreground font-mono mt-1">
                      Code: {diag.code}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.procedures && data.procedures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Procedures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.procedures.map((proc, index) => (
                <div key={index} className="p-3 border rounded-lg bg-card">
                  <div className="font-medium">{proc.description}</div>
                  {proc.code && (
                    <div className="text-sm text-muted-foreground font-mono">
                      Code: {proc.code}
                    </div>
                  )}
                  {proc.date && (
                    <div className="text-sm text-muted-foreground">
                      Date: {new Date(proc.date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <EnhancedMedicationCard 
        medications={data.medications} 
        title="Current Medications"
      />

      {data.allergies && data.allergies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Allergies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.allergies.map((allergy, index) => (
                <div key={index} className="p-3 border rounded-lg bg-card">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{allergy.allergen}</div>
                    {allergy.severity && (
                      <Badge variant={allergy.severity === 'severe' ? 'destructive' : 'secondary'}>
                        {allergy.severity}
                      </Badge>
                    )}
                  </div>
                  {allergy.reaction && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Reaction: {allergy.reaction}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.followUp && (
        <Card>
          <CardHeader>
            <CardTitle>Follow-up Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{data.followUp}</p>
          </CardContent>
        </Card>
      )}

      {data.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{data.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{report.title}</h1>
          {report.facility_name && (
            <p className="text-lg text-muted-foreground">{report.facility_name}</p>
          )}
          {report.report_date && (
            <p className="text-sm text-muted-foreground">
              Report Date: {new Date(report.report_date).toLocaleDateString()}
            </p>
          )}
        </div>
        
        {report.file_url && (
          <Button onClick={handleViewOriginal} variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Original
          </Button>
        )}
      </div>

      {/* Enhanced Status and Confidence Display */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Processing Status:</span>
                <Badge 
                  variant={report.parsing_status === 'completed' ? 'default' : 
                          report.parsing_status === 'processing' ? 'secondary' : 'destructive'}
                  className="flex items-center gap-1"
                >
                  {report.parsing_status === 'completed' && <CheckCircle className="h-3 w-3" />}
                  {report.parsing_status === 'failed' && <AlertCircle className="h-3 w-3" />}
                  {report.parsing_status}
                </Badge>
              </div>
              
              {report.parsing_confidence && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Extraction Confidence:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-primary">{report.parsing_confidence}%</span>
                    <Badge 
                      variant={report.parsing_confidence >= 80 ? 'default' : 
                              report.parsing_confidence >= 60 ? 'secondary' : 'destructive'}
                    >
                      {report.parsing_confidence >= 80 ? 'High' : 
                       report.parsing_confidence >= 60 ? 'Medium' : 'Low'}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content with Enhanced Error Handling */}
      {(() => {
        const structuredData = getStructuredData();
        console.log('Structured data for rendering:', structuredData);
        
        if (structuredData) {
          return (
            <div className="space-y-4">
              {structuredData.confidence && structuredData.confidence < 50 && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">
                        Low confidence extraction - some information may be incomplete or inaccurate.
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
              {renderStructuredData(structuredData)}
            </div>
          );
        }
        
        // Enhanced fallback to extracted text
        if (report.extracted_text) {
          return (
            <div className="space-y-4">
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-orange-800">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">
                      Unable to parse structured data. Showing raw extracted text below.
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Extracted Text
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-md overflow-auto max-h-96">
                    {report.extracted_text}
                  </pre>
                </CardContent>
              </Card>
            </div>
          );
        }
        
        return (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <AlertCircle className="h-8 w-8 text-red-600 mx-auto" />
                <p className="text-red-800 font-medium">No Data Available</p>
                <p className="text-red-600 text-sm">
                  This report has not been processed yet or processing failed. 
                  Please try reprocessing the document.
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}