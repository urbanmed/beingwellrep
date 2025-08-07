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
            const statusMap: Record<string, 'normal' | 'high' | 'low' | 'critical'> = {
              'normal': 'normal',
              'high': 'high', 
              'low': 'low',
              'critical': 'critical',
              'abnormal': 'high'
            };
            
            vitals.push({
              type: vital.type,
              value: vital.value + (vital.unit ? ` ${vital.unit}` : ''),
              status: statusMap[vital.status?.toLowerCase()] || 'normal',
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
              const statusMap: Record<string, 'normal' | 'high' | 'low' | 'critical'> = {
                'normal': 'normal',
                'high': 'high', 
                'low': 'low',
                'critical': 'critical',
                'abnormal': 'high'
              };
              
              vitals.push({
                type: vitalType,
                value: test.value + (test.unit ? ` ${test.unit}` : ''),
                status: statusMap[test.status?.toLowerCase()] || 'normal',
                icon: getVitalIcon(vitalType),
                date: report.report_date
              });
            }
          });
        }
      } catch (error) {
        console.warn('Error parsing vital data:', error);
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