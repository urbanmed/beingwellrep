import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Brain, TrendingUp, Plus, Loader2, FolderOpen, Shield, Zap, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useReports } from "@/hooks/useReports";

const Index = () => {
  const navigate = useNavigate();
  const { reports, loading } = useReports();

  const hasReports = reports.length > 0;
  const completedReports = reports.filter(r => r.parsing_status === 'completed');
  const processingReports = reports.filter(r => r.parsing_status === 'processing');
  const failedReports = reports.filter(r => r.parsing_status === 'failed');

  return (
    <div className="p-4 space-y-6">

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate('/summaries')}>
          <CardContent className="pt-6 text-center">
            <Brain className="h-8 w-8 text-primary mx-auto mb-2" />
            <h3 className="font-semibold">Insights</h3>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate('/upload')}>
          <CardContent className="pt-6 text-center">
            <Plus className="h-8 w-8 text-primary mx-auto mb-2" />
            <h3 className="font-semibold">Upload</h3>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-destructive/10 border-destructive/20 transition-colors" onClick={() => {
          // Placeholder SOS functionality
          alert("Emergency contacts feature coming soon!");
        }}>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <h3 className="font-semibold text-destructive">SOS</h3>
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
                <FolderOpen className="h-5 w-5 mr-2 text-primary" />
                Document Vault
              </div>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {hasReports && (
                <Badge variant="secondary">{reports.length} document{reports.length !== 1 ? 's' : ''}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {hasReports 
                ? "Secure storage for all your medical documents with AI-powered processing"
                : "Start building your digital health record with secure document storage"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasReports ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-green-600">{completedReports.length}</div>
                    <div className="text-muted-foreground">Processed</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-blue-600">{processingReports.length}</div>
                    <div className="text-muted-foreground">Processing</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-muted-foreground">
                      {(reports.reduce((acc, r) => acc + (r.file_size || 0), 0) / (1024 * 1024)).toFixed(1)} MB
                    </div>
                    <div className="text-muted-foreground">Storage</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => navigate('/vault')}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Open Vault
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/upload')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add More
                  </Button>
                </div>
              </div>
            ) : (
              <Button className="w-full" onClick={() => navigate('/upload')}>
                <Shield className="h-4 w-4 mr-2" />
                Start Your Vault
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2 text-primary" />
              AI Insights
            </CardTitle>
            <CardDescription>
              Get intelligent analysis and summaries from your medical documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full" onClick={() => navigate("/summaries")}>
              <Zap className="h-4 w-4 mr-2" />
              View AI Analysis
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-primary" />
              Health Timeline
            </CardTitle>
            <CardDescription>
              Track your health journey and view chronological insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full" onClick={() => navigate("/timeline")}>
              View Timeline
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
