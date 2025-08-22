import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Pill, Calendar, AlertTriangle, CheckCircle, Clock, Plus } from 'lucide-react';
import { useFHIRData } from '@/hooks/useFHIRData';
import { format, parseISO, differenceInDays, isAfter, isBefore, addDays } from 'date-fns';

interface MedicationInfo {
  id: string;
  name: string;
  status: string;
  intent: string;
  authoredOn: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  prescriber?: string;
  adherenceScore?: number;
  daysRemaining?: number;
  nextRefill?: string;
  interactions?: string[];
}

export function MedicationAdherence() {
  const { fetchFHIRMedicationRequests, loading } = useFHIRData();
  const [medications, setMedications] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');

  const loadMedications = async () => {
    try {
      const data = await fetchFHIRMedicationRequests();
      setMedications(data);
    } catch (error) {
      console.error('Failed to load FHIR medications:', error);
    }
  };

  useEffect(() => {
    loadMedications();
  }, []);

  const medicationInfo = useMemo(() => {
    return medications.map((med): MedicationInfo => {
      const resource = med.resource_data;
      
      // Extract dosage information
      const dosageInstruction = resource?.dosageInstruction?.[0];
      const dosage = dosageInstruction?.text || dosageInstruction?.doseAndRate?.[0]?.doseQuantity?.value + ' ' + dosageInstruction?.doseAndRate?.[0]?.doseQuantity?.unit;
      const frequency = dosageInstruction?.timing?.repeat?.frequency + ' times per ' + dosageInstruction?.timing?.repeat?.period + ' ' + dosageInstruction?.timing?.repeat?.periodUnit;
      
      // Calculate adherence score (mock calculation based on status and timing)
      let adherenceScore = 85; // Default good adherence
      if (med.status === 'completed') adherenceScore = 95;
      if (med.status === 'cancelled') adherenceScore = 0;
      if (med.status === 'draft') adherenceScore = 0;
      
      // Calculate days remaining (mock calculation)
      const authoredDate = parseISO(med.authored_on || new Date().toISOString());
      const estimatedDuration = 30; // Default 30 days
      const endDate = addDays(authoredDate, estimatedDuration);
      const daysRemaining = Math.max(0, differenceInDays(endDate, new Date()));
      
      return {
        id: med.id,
        name: med.medication_name,
        status: med.status,
        intent: med.intent,
        authoredOn: med.authored_on || new Date().toISOString(),
        dosage,
        frequency,
        prescriber: resource?.requester?.display,
        adherenceScore,
        daysRemaining,
        nextRefill: daysRemaining <= 7 ? format(addDays(new Date(), 3), 'MMM dd') : undefined,
        interactions: [] // Would be calculated from other medications
      };
    });
  }, [medications]);

  const filteredMedications = medicationInfo.filter(med => 
    selectedStatus === 'all' || med.status === selectedStatus
  );

  const stats = useMemo(() => {
    const active = medicationInfo.filter(m => m.status === 'active');
    const needRefill = active.filter(m => m.daysRemaining && m.daysRemaining <= 7);
    const avgAdherence = medicationInfo.length > 0 
      ? medicationInfo.reduce((sum, m) => sum + (m.adherenceScore || 0), 0) / medicationInfo.length 
      : 0;
    
    return {
      total: medicationInfo.length,
      active: active.length,
      needRefill: needRefill.length,
      avgAdherence: Math.round(avgAdherence)
    };
  }, [medicationInfo]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'draft': return 'warning';
      default: return 'outline';
    }
  };

  const getAdherenceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Pill className="h-8 w-8 animate-pulse mx-auto mb-2" />
          <p>Loading medications...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Medications</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Pill className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Need Refill</p>
                <p className="text-2xl font-bold text-orange-600">{stats.needRefill}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Adherence</p>
                <p className={`text-2xl font-bold ${getAdherenceColor(stats.avgAdherence)}`}>
                  {stats.avgAdherence}%
                </p>
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center">
                <span className="text-xs font-bold">{Math.round(stats.avgAdherence / 10)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Medication List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Medications
            </CardTitle>
            <div className="flex gap-2">
              {['all', 'active', 'completed', 'cancelled'].map((status) => (
                <Button
                  key={status}
                  variant={selectedStatus === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus(status as any)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredMedications.length === 0 ? (
            <div className="text-center py-8">
              <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No Medications Found</p>
              <p className="text-muted-foreground">
                {selectedStatus === 'all' 
                  ? 'Upload prescription documents to track medication adherence.'
                  : `No ${selectedStatus} medications found.`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMedications.map((medication) => (
                <Card key={medication.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{medication.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getStatusColor(medication.status)}>
                            {medication.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Prescribed {format(parseISO(medication.authoredOn), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getAdherenceColor(medication.adherenceScore || 0)}`}>
                          {medication.adherenceScore}%
                        </div>
                        <p className="text-sm text-muted-foreground">Adherence</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {medication.dosage && (
                        <div>
                          <p className="text-sm text-muted-foreground">Dosage</p>
                          <p className="font-medium">{medication.dosage}</p>
                        </div>
                      )}
                      {medication.frequency && (
                        <div>
                          <p className="text-sm text-muted-foreground">Frequency</p>
                          <p className="font-medium">{medication.frequency}</p>
                        </div>
                      )}
                      {medication.prescriber && (
                        <div>
                          <p className="text-sm text-muted-foreground">Prescriber</p>
                          <p className="font-medium">{medication.prescriber}</p>
                        </div>
                      )}
                    </div>
                    
                    {medication.adherenceScore && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Adherence Progress</span>
                          <span className="text-sm font-medium">{medication.adherenceScore}%</span>
                        </div>
                        <Progress value={medication.adherenceScore} className="h-2" />
                      </div>
                    )}
                    
                    {medication.status === 'active' && (
                      <div className="flex items-center justify-between text-sm">
                        {medication.daysRemaining !== undefined && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {medication.daysRemaining > 0 
                                ? `${medication.daysRemaining} days remaining`
                                : 'Refill needed'
                              }
                            </span>
                          </div>
                        )}
                        {medication.nextRefill && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Next refill: {medication.nextRefill}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}