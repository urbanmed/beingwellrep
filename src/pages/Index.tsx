import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Brain, TrendingUp, Plus, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useReports } from "@/hooks/useReports";

const Index = () => {
  const navigate = useNavigate();
  const { reports, loading } = useReports();

  const hasReports = reports.length > 0;
  const completedReports = reports.filter(r => r.ocr_status === 'completed');
  const processingReports = reports.filter(r => r.ocr_status === 'processing');
  const failedReports = reports.filter(r => r.ocr_status === 'failed');

  return (
    <div className="p-4 space-y-6">
      {/* Welcome Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Health Buddy</h1>
        <p className="text-muted-foreground">
          Your AI-powered health companion
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate('/upload')}>
          <CardContent className="pt-6 text-center">
            <Plus className="h-8 w-8 text-primary mx-auto mb-2" />
            <h3 className="font-semibold">Upload</h3>
            <p className="text-sm text-muted-foreground">Add documents</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate('/summaries')}>
          <CardContent className="pt-6 text-center">
            <Brain className="h-8 w-8 text-primary mx-auto mb-2" />
            <h3 className="font-semibold">AI Insights</h3>
            <p className="text-sm text-muted-foreground">View analysis</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Features */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Features</h2>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                Medical Reports
              </div>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {hasReports && (
                <Badge variant="secondary">{reports.length} report{reports.length !== 1 ? 's' : ''}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {hasReports 
                ? "Manage your uploaded medical documents and view their status"
                : "Upload and organize your medical documents for easy access"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasReports ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-green-600">{completedReports.length}</div>
                    <div className="text-muted-foreground">Ready</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-blue-600">{processingReports.length}</div>
                    <div className="text-muted-foreground">Processing</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-red-600">{failedReports.length}</div>
                    <div className="text-muted-foreground">Failed</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => navigate('/reports')}>
                    View Reports
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/upload')}>
                    Upload More
                  </Button>
                </div>
              </div>
            ) : (
              <Button className="w-full" onClick={() => navigate('/upload')}>
                Upload Your First Report
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2 text-primary" />
              AI Analysis
            </CardTitle>
            <CardDescription>
              Get intelligent insights and summaries from your health data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full" onClick={() => navigate("/summaries")}>
              View AI Summaries
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-primary" />
              Health Trends
            </CardTitle>
            <CardDescription>
              Track patterns and changes in your health over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full">
              View Health Analytics
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
