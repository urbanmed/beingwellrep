import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, Activity, Pill, FileText, AlertCircle } from 'lucide-react';
import { useFHIRData } from '@/hooks/useFHIRData';
import { format, parseISO } from 'date-fns';

interface FHIRDataViewerProps {
  reportId: string;
  reportTitle: string;
}

export function FHIRDataViewer({ reportId, reportTitle }: FHIRDataViewerProps) {
  const { 
    fetchFHIRObservations, 
    fetchFHIRMedicationRequests, 
    fetchFHIRDiagnosticReports,
    loading 
  } = useFHIRData();
  
  const [observations, setObservations] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [diagnosticReports, setDiagnosticReports] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('observations');

  useEffect(() => {
    const loadFHIRData = async () => {
      try {
        const [obsData, medData, diagData] = await Promise.all([
          fetchFHIRObservations(),
          fetchFHIRMedicationRequests(),
          fetchFHIRDiagnosticReports()
        ]);
        
        // Filter by source report ID
        setObservations(obsData.filter(obs => obs.source_report_id === reportId));
        setMedications(medData.filter(med => med.source_report_id === reportId));
        setDiagnosticReports(diagData.filter(diag => diag.source_report_id === reportId));
      } catch (error) {
        console.error('Failed to load FHIR data:', error);
      }
    };

    loadFHIRData();
  }, [reportId, fetchFHIRObservations, fetchFHIRMedicationRequests, fetchFHIRDiagnosticReports]);

  const hasAnyData = observations.length > 0 || medications.length > 0 || diagnosticReports.length > 0;

  const getObservationStatus = (status: string) => {
    switch (status) {
      case 'final': return 'success';
      case 'preliminary': return 'warning';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getMedicationStatus = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Target className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading FHIR data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!hasAnyData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">No FHIR Data Available</p>
          <p className="text-muted-foreground">
            This document hasn't been processed into structured FHIR format yet, or no structured medical data was found.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">FHIR Structured Data</h3>
        <Badge variant="outline">
          {observations.length + medications.length + diagnosticReports.length} resources
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="observations" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Observations ({observations.length})
          </TabsTrigger>
          <TabsTrigger value="medications" className="flex items-center gap-2">
            <Pill className="h-4 w-4" />
            Medications ({medications.length})
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reports ({diagnosticReports.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="observations" className="space-y-4">
          {observations.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No observations found in this document</p>
              </CardContent>
            </Card>
          ) : (
            observations.map((obs) => {
              const resource = obs.resource_data;
              const value = resource?.valueQuantity?.value || 'N/A';
              const unit = resource?.valueQuantity?.unit || '';
              const code = resource?.code?.coding?.[0]?.display || obs.observation_type;
              
              return (
                <Card key={obs.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{code}</CardTitle>
                      <Badge variant={getObservationStatus(obs.status)}>
                        {obs.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Value</p>
                        <p className="font-medium">{value} {unit}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Date</p>
                        <p className="font-medium">
                          {obs.effective_date_time ? format(parseISO(obs.effective_date_time), 'MMM dd, yyyy') : 'N/A'}
                        </p>
                      </div>
                    </div>
                    {resource?.referenceRange?.[0] && (
                      <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                        <p className="text-muted-foreground">Reference Range</p>
                        <p>{resource.referenceRange[0].low?.value || 'N/A'} - {resource.referenceRange[0].high?.value || 'N/A'} {unit}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="medications" className="space-y-4">
          {medications.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Pill className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No medications found in this document</p>
              </CardContent>
            </Card>
          ) : (
            medications.map((med) => {
              const resource = med.resource_data;
              const dosage = resource?.dosageInstruction?.[0]?.text || 'N/A';
              
              return (
                <Card key={med.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{med.medication_name}</CardTitle>
                      <Badge variant={getMedicationStatus(med.status)}>
                        {med.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Dosage Instructions</p>
                        <p className="font-medium">{dosage}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-muted-foreground">Intent</p>
                          <p className="font-medium capitalize">{med.intent}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Authored On</p>
                          <p className="font-medium">
                            {med.authored_on ? format(parseISO(med.authored_on), 'MMM dd, yyyy') : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-4">
          {diagnosticReports.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No diagnostic reports found in this document</p>
              </CardContent>
            </Card>
          ) : (
            diagnosticReports.map((report) => {
              const resource = report.resource_data;
              const category = resource?.category?.[0]?.coding?.[0]?.display || report.report_type;
              
              return (
                <Card key={report.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{category}</CardTitle>
                      <Badge variant={getObservationStatus(report.status)}>
                        {report.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Report Type</p>
                        <p className="font-medium capitalize">{report.report_type}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Effective Date</p>
                        <p className="font-medium">
                          {report.effective_date_time ? format(parseISO(report.effective_date_time), 'MMM dd, yyyy') : 'N/A'}
                        </p>
                      </div>
                    </div>
                    {resource?.conclusion && (
                      <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                        <p className="text-muted-foreground">Conclusion</p>
                        <p>{resource.conclusion}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}