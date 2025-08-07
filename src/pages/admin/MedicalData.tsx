import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Heart, Brain, Stethoscope } from 'lucide-react';

export default function MedicalData() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Medical Data</h1>
        <p className="text-muted-foreground">
          Monitor and manage medical data processing and validation
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports Processed</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,847</div>
            <p className="text-xs text-muted-foreground">
              +15% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Quality Score</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.5%</div>
            <p className="text-xs text-muted-foreground">
              +2.1% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Accuracy</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">97.2%</div>
            <p className="text-xs text-muted-foreground">
              +0.8% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validation Errors</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-muted-foreground">
              -12% from last week
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Medical Data Processing</CardTitle>
          <CardDescription>
            Latest medical document processing results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { id: "MD001", type: "Blood Test", status: "Processed", confidence: 98 },
              { id: "MD002", type: "X-Ray Report", status: "Processing", confidence: null },
              { id: "MD003", type: "MRI Scan", status: "Validated", confidence: 95 },
              { id: "MD004", type: "Lab Results", status: "Error", confidence: null },
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">{item.id}</h3>
                  <p className="text-sm text-muted-foreground">{item.type}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {item.confidence && (
                    <span className="text-sm text-muted-foreground">
                      {item.confidence}% confidence
                    </span>
                  )}
                  <Badge variant={
                    item.status === 'Processed' || item.status === 'Validated' ? 'default' :
                    item.status === 'Processing' ? 'secondary' : 'destructive'
                  }>
                    {item.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}