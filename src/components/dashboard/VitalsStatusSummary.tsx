import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Thermometer, Activity, Scale } from "lucide-react";
import { useReports } from "@/hooks/useReports";
import { useMemo } from "react";

interface VitalSign {
  type: string;
  value: string;
  status: 'normal' | 'high' | 'low' | 'critical';
  icon: React.ComponentType<any>;
  date: string;
}

export function VitalsStatusSummary() {
  const { reports } = useReports();

  const latestVitals = useMemo(() => {
    const vitals: VitalSign[] = [];
    
    // Extract vitals from recent reports
    const recentReports = reports
      .filter(r => r.parsing_status === 'completed' && r.parsed_data)
      .slice(0, 10); // Check last 10 reports
    
    for (const report of recentReports) {
      try {
        const data = typeof report.parsed_data === 'string' 
          ? JSON.parse(report.parsed_data) 
          : report.parsed_data;
        
        // Check dedicated vitals section
        if (data?.vitals) {
          data.vitals.forEach((vital: any) => {
            const status = normalizeVitalStatus(vital.status);
            
            vitals.push({
              type: vital.type,
              value: vital.value + (vital.unit ? ` ${vital.unit}` : ''),
              status,
              icon: getVitalIcon(vital.type),
              date: report.report_date
            });
          });
        }
        
        // Extract vitals from lab test results
        if (data?.tests) {
          data.tests.forEach((test: any) => {
            const testName = test.name?.toLowerCase() || '';
            
            // Check if this test represents a vital sign
            if (isVitalSignTest(testName)) {
              const vitalType = mapTestToVitalType(testName);
              const status = normalizeVitalStatus(test.status);
              
              vitals.push({
                type: vitalType,
                value: test.value + (test.unit ? ` ${test.unit}` : ''),
                status,
                icon: getVitalIcon(vitalType),
                date: report.report_date
              });
            }
          });
        }
        
        // Enhanced parsing for raw response data
        if (data?.rawResponse && typeof data.rawResponse === 'string') {
          const extractedVitals = parseVitalsFromText(data.rawResponse, report.report_date);
          vitals.push(...extractedVitals);
        }
        
        // Check sections for general documents
        if (data?.sections && Array.isArray(data.sections)) {
          data.sections.forEach((section: any) => {
            if (section.content) {
              const extractedVitals = parseVitalsFromText(section.content, report.report_date);
              vitals.push(...extractedVitals);
            }
          });
        }
        
      } catch (error) {
        console.warn('Error parsing vital data:', error);
        
        // Fallback: try to parse the raw extracted text
        if (report.extracted_text) {
          try {
            const extractedVitals = parseVitalsFromText(report.extracted_text, report.report_date);
            vitals.push(...extractedVitals);
          } catch (textError) {
            console.warn('Failed to parse extracted text for vitals:', textError);
          }
        }
      }
    }
    
    // Get most recent for each type
    const uniqueVitals = vitals.reduce((acc, vital) => {
      if (!acc[vital.type] || new Date(vital.date) > new Date(acc[vital.type].date)) {
        acc[vital.type] = vital;
      }
      return acc;
    }, {} as Record<string, VitalSign>);
    
    return Object.values(uniqueVitals).slice(0, 4);
  }, [reports]);

  // Helper function to normalize vital status
  const normalizeVitalStatus = (status: string | undefined): 'normal' | 'high' | 'low' | 'critical' => {
    if (!status) return 'normal';
    
    const normalized = status.toLowerCase().trim();
    if (normalized.includes('critical') || normalized.includes('severe')) return 'critical';
    if (normalized.includes('high') || normalized.includes('elevated') || normalized.includes('abnormal')) return 'high';
    if (normalized.includes('low') || normalized.includes('decreased')) return 'low';
    return 'normal';
  };

  // Helper function to parse vitals from raw text
  const parseVitalsFromText = (text: string, date: string): VitalSign[] => {
    const vitals: VitalSign[] = [];
    
    // Patterns for common vital signs
    const vitalPatterns = [
      /blood\s+pressure\s*:?\s*([0-9]+\/[0-9]+|[0-9]+)\s*(mmhg)?/gi,
      /heart\s+rate\s*:?\s*([0-9]+)\s*(bpm)?/gi,
      /pulse\s*:?\s*([0-9]+)\s*(bpm)?/gi,
      /temperature\s*:?\s*([0-9.]+)\s*(°?[cf])?/gi,
      /temp\s*:?\s*([0-9.]+)\s*(°?[cf])?/gi,
      /respiratory\s+rate\s*:?\s*([0-9]+)/gi,
      /breathing\s+rate\s*:?\s*([0-9]+)/gi,
      /oxygen\s+saturation\s*:?\s*([0-9]+)%?/gi,
      /spo2\s*:?\s*([0-9]+)%?/gi,
      /weight\s*:?\s*([0-9.]+)\s*(kg|lbs?|pounds?)?/gi,
      /height\s*:?\s*([0-9.]+)\s*(cm|ft|inches?|in)?/gi,
      /bmi\s*:?\s*([0-9.]+)/gi
    ];
    
    for (const pattern of vitalPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        try {
          const fullMatch = match[0];
          const value = match[1];
          const unit = match[2] || '';
          
          const vitalType = determineVitalTypeFromPattern(fullMatch);
          if (vitalType && value) {
            // Simple status determination based on common ranges
            const status = determineStatusFromVitalValue(vitalType, value, unit);
            
            vitals.push({
              type: vitalType,
              value: value + (unit ? ` ${unit}` : ''),
              status,
              icon: getVitalIcon(vitalType),
              date
            });
          }
        } catch (parseError) {
          console.warn('Error parsing vital from text:', parseError);
        }
      }
    }
    
    return vitals;
  };

  const determineVitalTypeFromPattern = (text: string): string => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('blood') || lowerText.includes('pressure')) return 'blood_pressure';
    if (lowerText.includes('heart') || lowerText.includes('pulse')) return 'heart_rate';
    if (lowerText.includes('temperature') || lowerText.includes('temp')) return 'temperature';
    if (lowerText.includes('respiratory') || lowerText.includes('breathing')) return 'respiratory_rate';
    if (lowerText.includes('oxygen') || lowerText.includes('spo2')) return 'oxygen_saturation';
    if (lowerText.includes('weight')) return 'weight';
    if (lowerText.includes('height')) return 'height';
    if (lowerText.includes('bmi')) return 'bmi';
    return 'unknown';
  };

  const determineStatusFromVitalValue = (type: string, value: string, unit: string): 'normal' | 'high' | 'low' | 'critical' => {
    try {
      const numValue = parseFloat(value.replace(/[^\d.-]/g, ''));
      if (isNaN(numValue)) return 'normal';
      
      switch (type) {
        case 'heart_rate':
          if (numValue < 40 || numValue > 140) return 'critical';
          if (numValue < 60 || numValue > 100) return 'high';
          return 'normal';
        
        case 'blood_pressure':
          // For systolic (simplified)
          if (numValue > 180 || numValue < 70) return 'critical';
          if (numValue > 140 || numValue < 90) return 'high';
          return 'normal';
        
        case 'temperature':
          if (unit.toLowerCase().includes('f')) {
            if (numValue > 104 || numValue < 95) return 'critical';
            if (numValue > 100.4 || numValue < 97) return 'high';
          } else {
            if (numValue > 40 || numValue < 35) return 'critical';
            if (numValue > 38 || numValue < 36) return 'high';
          }
          return 'normal';
        
        case 'oxygen_saturation':
          if (numValue < 88) return 'critical';
          if (numValue < 95) return 'high';
          return 'normal';
        
        default:
          return 'normal';
      }
    } catch (error) {
      return 'normal';
    }
  };

  // Helper function to identify if a test is a vital sign
  const isVitalSignTest = (testName: string): boolean => {
    const vitalKeywords = [
      'blood pressure', 'bp', 'systolic', 'diastolic',
      'heart rate', 'pulse', 'hr', 'bpm',
      'temperature', 'temp', 'fever',
      'respiratory rate', 'breathing rate', 'rr',
      'oxygen saturation', 'spo2', 'o2 sat',
      'weight', 'wt', 'body weight',
      'height', 'ht', 'body height',
      'bmi', 'body mass index'
    ];
    
    return vitalKeywords.some(keyword => testName.includes(keyword));
  };

  // Helper function to map test names to standard vital types
  const mapTestToVitalType = (testName: string): string => {
    if (testName.includes('blood pressure') || testName.includes('bp') || 
        testName.includes('systolic') || testName.includes('diastolic')) {
      return 'blood_pressure';
    }
    if (testName.includes('heart rate') || testName.includes('pulse') || 
        testName.includes('hr') || testName.includes('bpm')) {
      return 'heart_rate';
    }
    if (testName.includes('temperature') || testName.includes('temp') || testName.includes('fever')) {
      return 'temperature';
    }
    if (testName.includes('respiratory') || testName.includes('breathing') || testName.includes('rr')) {
      return 'respiratory_rate';
    }
    if (testName.includes('oxygen') || testName.includes('spo2') || testName.includes('o2')) {
      return 'oxygen_saturation';
    }
    if (testName.includes('weight') || testName.includes('wt')) {
      return 'weight';
    }
    if (testName.includes('height') || testName.includes('ht')) {
      return 'height';
    }
    if (testName.includes('bmi') || testName.includes('body mass')) {
      return 'bmi';
    }
    return testName.replace(/\s+/g, '_');
  };

  const getVitalIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('blood') || lowerType.includes('pressure')) return Heart;
    if (lowerType.includes('temperature')) return Thermometer;
    if (lowerType.includes('heart') || lowerType.includes('pulse')) return Activity;
    if (lowerType.includes('weight') || lowerType.includes('bmi')) return Scale;
    return Activity;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'destructive';
      case 'high': return 'warning';
      case 'low': return 'warning';
      default: return 'success';
    }
  };

  if (latestVitals.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="medical-heading-sm flex items-center">
            <Heart className="h-4 w-4 mr-2 text-primary" />
            Vitals Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="medical-annotation text-center py-4">
            No vital signs found in your recent reports
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="medical-heading-sm flex items-center">
          <Heart className="h-4 w-4 mr-2 text-primary" />
          Vitals Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {latestVitals.map((vital, index) => {
          const Icon = vital.icon;
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="medical-label-xs capitalize">
                  {vital.type.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="medical-annotation font-medium">{vital.value}</span>
                <Badge variant={getStatusColor(vital.status)} className="text-xs">
                  {vital.status}
                </Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}