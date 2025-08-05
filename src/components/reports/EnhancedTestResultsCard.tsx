import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TestTube, AlertTriangle, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { TestResult } from "@/types/medical-data";

interface EnhancedTestResultsCardProps {
  testPanels?: Array<{
    name: string;
    category?: string;
    tests: TestResult[];
  }>;
  tests?: TestResult[];
  title?: string;
}

function getStatusIcon(status?: string) {
  switch (status?.toLowerCase()) {
    case 'normal':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'abnormal':
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    case 'critical':
    case 'high':
    case 'low':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-blue-600" />;
    default:
      return null;
  }
}

function getStatusColor(status?: string) {
  switch (status?.toLowerCase()) {
    case 'normal':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'abnormal':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'critical':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'high':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'low':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'pending':
      return 'bg-gray-50 text-gray-700 border-gray-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

function TestResultItem({ test, level = 0 }: { test: TestResult; level?: number }) {
  const indentClass = level > 0 ? `ml-${level * 4}` : '';
  
  return (
    <div className={`space-y-2 ${indentClass}`}>
      <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
        <div className="flex items-center gap-3 flex-1">
          {getStatusIcon(test.status)}
          <div className="flex-1">
            <div className="font-medium text-foreground">{test.name}</div>
            {test.category && (
              <div className="text-xs text-muted-foreground">{test.category}</div>
            )}
            {test.methodology && (
              <div className="text-xs text-muted-foreground">Method: {test.methodology}</div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3 text-right">
          <div>
            <div className="font-semibold text-foreground">
              {test.value} {test.unit && <span className="text-muted-foreground">{test.unit}</span>}
            </div>
            {test.referenceRange && (
              <div className="text-xs text-muted-foreground">Ref: {test.referenceRange}</div>
            )}
          </div>
          
          {test.status && (
            <Badge className={`text-xs ${getStatusColor(test.status)}`}>
              {test.status}
            </Badge>
          )}
        </div>
      </div>
      
      {test.flags && test.flags.length > 0 && (
        <div className="flex gap-1 ml-3">
          {test.flags.map((flag, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {flag}
            </Badge>
          ))}
        </div>
      )}
      
      {test.notes && (
        <div className="text-sm text-muted-foreground ml-3 p-2 bg-muted/50 rounded">
          {test.notes}
        </div>
      )}
      
      {test.subTests && test.subTests.length > 0 && (
        <div className="ml-3 space-y-2">
          {test.subTests.map((subTest, index) => (
            <TestResultItem key={index} test={subTest} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function EnhancedTestResultsCard({ 
  testPanels, 
  tests, 
  title = "Test Results" 
}: EnhancedTestResultsCardProps) {
  const hasData = (testPanels && testPanels.length > 0) || (tests && tests.length > 0);
  
  if (!hasData) {
    return null;
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TestTube className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {testPanels && testPanels.map((panel, panelIndex) => (
          <div key={panelIndex} className="space-y-4">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-foreground">{panel.name}</h4>
              {panel.category && (
                <Badge variant="secondary" className="text-xs">
                  {panel.category}
                </Badge>
              )}
            </div>
            
            <div className="space-y-3">
              {panel.tests.map((test, testIndex) => (
                <TestResultItem key={testIndex} test={test} />
              ))}
            </div>
            
            {panelIndex < testPanels.length - 1 && <Separator />}
          </div>
        ))}
        
        {tests && tests.length > 0 && (
          <div className="space-y-3">
            {testPanels && testPanels.length > 0 && <Separator />}
            {tests.map((test, testIndex) => (
              <TestResultItem key={testIndex} test={test} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}