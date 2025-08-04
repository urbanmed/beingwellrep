import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Brain, TrendingUp, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

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

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
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
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary" />
              Medical Reports
            </CardTitle>
            <CardDescription>
              Upload and organize your medical documents for easy access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/upload')}>
              Upload Your First Report
            </Button>
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
