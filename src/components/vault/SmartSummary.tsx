import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  Heart, 
  Activity, 
  Shield, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SmartSummaryProps {
  totalReports: number;
  criticalReports: number;
  recentUploads: number;
  completedReports: number;
}

interface HealthScore {
  overall: number;
  completeness: number;
  recency: number;
  variety: number;
}

export function SmartSummary({ totalReports, criticalReports, recentUploads, completedReports }: SmartSummaryProps) {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);

  // Calculate AI Health Score
  const healthScore: HealthScore = {
    overall: Math.min(95, Math.max(45, (completedReports / Math.max(totalReports, 1)) * 70 + (recentUploads > 0 ? 20 : 0) + 10)),
    completeness: (completedReports / Math.max(totalReports, 1)) * 100,
    recency: recentUploads > 0 ? 85 : 60,
    variety: Math.min(100, (totalReports / 10) * 100)
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return "default" as const;
    if (score >= 60) return "secondary" as const;
    return "destructive" as const;
  };

  return (
    <Card className="mb-6 medical-card-glow">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="medical-heading">Smart Health Summary</CardTitle>
              <p className="medical-label">AI-powered insights from your medical data</p>
            </div>
          </div>
          <Badge variant={getScoreBadgeVariant(healthScore.overall)} className="text-lg px-4 py-2">
            {Math.round(healthScore.overall)}% Health Score
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center mb-2">
              <Heart className="h-5 w-5 text-red-500" />
            </div>
            <div className="text-2xl font-bold medical-heading">{totalReports}</div>
            <div className="text-sm medical-label">Total Documents</div>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold medical-heading">{completedReports}</div>
            <div className="text-sm medical-label">Processed</div>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold medical-heading">{recentUploads}</div>
            <div className="text-sm medical-label">Recent Uploads</div>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className={`h-5 w-5 ${criticalReports > 0 ? 'text-red-500' : 'text-gray-400'}`} />
            </div>
            <div className="text-2xl font-bold medical-heading">{criticalReports}</div>
            <div className="text-sm medical-label">Critical Items</div>
          </div>
        </div>

        {/* Health Score Breakdown */}
        {showDetails && (
          <div className="space-y-4 p-4 rounded-lg bg-muted/30">
            <h4 className="medical-heading-sm">Health Score Breakdown</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <span className="medical-label">Data Completeness</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Progress value={healthScore.completeness} className="w-20 h-2" />
                  <span className={`text-sm font-medium ${getScoreColor(healthScore.completeness)}`}>
                    {Math.round(healthScore.completeness)}%
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  <span className="medical-label">Data Recency</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Progress value={healthScore.recency} className="w-20 h-2" />
                  <span className={`text-sm font-medium ${getScoreColor(healthScore.recency)}`}>
                    {Math.round(healthScore.recency)}%
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <span className="medical-label">Data Variety</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Progress value={healthScore.variety} className="w-20 h-2" />
                  <span className={`text-sm font-medium ${getScoreColor(healthScore.variety)}`}>
                    {Math.round(healthScore.variety)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
            <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${showDetails ? 'rotate-90' : ''}`} />
          </Button>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/summaries")}
            >
              <Brain className="h-4 w-4 mr-1" />
              AI Insights
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/upload")}
            >
              Add Document
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}