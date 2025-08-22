import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Activity, AlertCircle, Calendar } from 'lucide-react';
import { useFHIRData } from '@/hooks/useFHIRData';
import { format, parseISO, subMonths } from 'date-fns';

interface TrendData {
  date: string;
  value: number;
  unit?: string;
  status?: string;
  referenceRange?: { low?: number; high?: number };
}

interface HealthTrend {
  type: string;
  name: string;
  data: TrendData[];
  unit: string;
  lastValue: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  status: 'normal' | 'high' | 'low' | 'critical';
  referenceRange?: { low?: number; high?: number };
}

export function FHIRHealthTrends() {
  const { fetchFHIRObservations, loading } = useFHIRData();
  const [selectedPeriod, setSelectedPeriod] = useState<'3m' | '6m' | '1y'>('6m');
  const [observations, setObservations] = useState<any[]>([]);

  const loadObservations = async () => {
    try {
      const data = await fetchFHIRObservations();
      setObservations(data);
    } catch (error) {
      console.error('Failed to load FHIR observations:', error);
    }
  };

  useEffect(() => {
    loadObservations();
  }, []);

  const healthTrends = useMemo(() => {
    const trends: HealthTrend[] = [];
    const cutoffDate = subMonths(new Date(), selectedPeriod === '3m' ? 3 : selectedPeriod === '6m' ? 6 : 12);
    
    // Group observations by type
    const observationsByType = observations.reduce((acc, obs) => {
      if (!obs.effective_date_time || new Date(obs.effective_date_time) < cutoffDate) return acc;
      
      const resourceData = obs.resource_data;
      const observationType = resourceData?.code?.coding?.[0]?.display || obs.observation_type || 'Unknown';
      
      if (!acc[observationType]) {
        acc[observationType] = [];
      }
      
      // Extract value and unit
      let value = 0;
      let unit = '';
      
      if (resourceData?.valueQuantity) {
        value = resourceData.valueQuantity.value || 0;
        unit = resourceData.valueQuantity.unit || '';
      } else if (resourceData?.component) {
        // Handle multi-component observations (like blood pressure)
        const systolic = resourceData.component.find((c: any) => 
          c.code?.coding?.[0]?.display?.toLowerCase().includes('systolic')
        );
        if (systolic?.valueQuantity) {
          value = systolic.valueQuantity.value;
          unit = systolic.valueQuantity.unit || 'mmHg';
        }
      }
      
      acc[observationType].push({
        date: obs.effective_date_time,
        value,
        unit,
        status: obs.status,
        referenceRange: resourceData?.referenceRange?.[0]
      });
      
      return acc;
    }, {} as Record<string, TrendData[]>);
    
    // Convert to trend objects
    Object.entries(observationsByType).forEach(([type, data]) => {
      const typedData = data as TrendData[];
      if (typedData.length < 2) return; // Need at least 2 data points for trends
      
      const sortedData = typedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const lastValue = sortedData[sortedData.length - 1]?.value || 0;
      const previousValue = sortedData[sortedData.length - 2]?.value || 0;
      
      const trendPercentage = previousValue !== 0 ? ((lastValue - previousValue) / previousValue) * 100 : 0;
      const trend = Math.abs(trendPercentage) < 5 ? 'stable' : trendPercentage > 0 ? 'up' : 'down';
      
      // Determine status based on reference ranges or common medical ranges
      let status: 'normal' | 'high' | 'low' | 'critical' = 'normal';
      const refRange = sortedData[0]?.referenceRange;
      
      if (refRange) {
        if (refRange.high && lastValue > refRange.high) status = 'high';
        if (refRange.low && lastValue < refRange.low) status = 'low';
      } else {
        // Common medical reference ranges
        if (type.toLowerCase().includes('glucose')) {
          if (lastValue > 140) status = 'high';
          if (lastValue < 70) status = 'low';
        } else if (type.toLowerCase().includes('cholesterol')) {
          if (lastValue > 240) status = 'high';
        } else if (type.toLowerCase().includes('blood pressure')) {
          if (lastValue > 140) status = 'high';
          if (lastValue < 90) status = 'low';
        }
      }
      
      trends.push({
        type,
        name: type,
        data: sortedData,
        unit: sortedData[0]?.unit || '',
        lastValue,
        trend,
        trendPercentage: Math.abs(trendPercentage),
        status,
        referenceRange: refRange
      });
    });
    
    return trends.sort((a, b) => b.data.length - a.data.length);
  }, [observations, selectedPeriod]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-green-500" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'destructive';
      case 'high': return 'warning';
      case 'low': return 'warning';
      default: return 'success';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading health trends...</p>
        </CardContent>
      </Card>
    );
  }

  if (healthTrends.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Health Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">No Trend Data Available</p>
          <p className="text-muted-foreground">
            Upload more medical reports with lab results to see your health trends over time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Health Trends
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={selectedPeriod === '3m' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod('3m')}
              >
                3M
              </Button>
              <Button
                variant={selectedPeriod === '6m' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod('6m')}
              >
                6M
              </Button>
              <Button
                variant={selectedPeriod === '1y' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod('1y')}
              >
                1Y
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6">
        {healthTrends.map((trend, index) => (
          <Card key={index}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{trend.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-medium">
                      {trend.lastValue} {trend.unit}
                    </span>
                    <Badge variant={getStatusColor(trend.status)}>
                      {trend.status}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(trend.trend)}
                      <span className="text-sm text-muted-foreground">
                        {trend.trendPercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline">{trend.data.length} readings</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(parseISO(date), 'MMM dd')}
                    />
                    <YAxis domain={['dataMin - 10', 'dataMax + 10']} />
                    <Tooltip
                      labelFormatter={(date) => format(parseISO(date as string), 'MMM dd, yyyy')}
                      formatter={(value, name) => [`${value} ${trend.unit}`, 'Value']}
                    />
                    {trend.referenceRange?.high && (
                      <ReferenceLine 
                        y={trend.referenceRange.high} 
                        stroke="red" 
                        strokeDasharray="5 5"
                        label="High"
                      />
                    )}
                    {trend.referenceRange?.low && (
                      <ReferenceLine 
                        y={trend.referenceRange.low} 
                        stroke="red" 
                        strokeDasharray="5 5"
                        label="Low"
                      />
                    )}
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}