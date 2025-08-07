import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  Camera, 
  Smartphone, 
  Sparkles,
  CheckCircle,
  ArrowRight,
  Target,
  Trophy,
  Star
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface EnhancedUploadCTAProps {
  totalReports: number;
  showGamification?: boolean;
}

export function EnhancedUploadCTA({ totalReports, showGamification = true }: EnhancedUploadCTAProps) {
  const navigate = useNavigate();
  const [animationStep, setAnimationStep] = useState(0);

  // Gamification levels
  const levels = [
    { threshold: 0, title: "Getting Started", description: "Upload your first document", icon: Target },
    { threshold: 1, title: "Building Momentum", description: "Upload 5 documents", icon: Trophy },
    { threshold: 5, title: "Health Tracker", description: "Upload 15 documents", icon: Star },
    { threshold: 15, title: "Wellness Expert", description: "Upload 25+ documents", icon: Sparkles },
  ];

  const currentLevel = levels.reverse().find(level => totalReports >= level.threshold) || levels[0];
  const nextLevel = levels.find(level => totalReports < level.threshold);
  const progress = nextLevel ? ((totalReports - currentLevel.threshold) / (nextLevel.threshold - currentLevel.threshold)) * 100 : 100;

  // Animation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationStep((prev) => (prev + 1) % 3);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const uploadMethods = [
    {
      icon: FileText,
      title: "Upload Files",
      description: "PDF, images, or scanned documents",
      color: "bg-blue-500",
      action: () => navigate("/upload")
    },
    {
      icon: Camera,
      title: "Take Photo",
      description: "Instantly capture medical documents",
      color: "bg-green-500",
      action: () => navigate("/upload")
    },
    {
      icon: Smartphone,
      title: "Mobile Upload",
      description: "Drag & drop from your device",
      color: "bg-purple-500",
      action: () => navigate("/upload")
    }
  ];

  if (totalReports === 0) {
    return (
      <Card className="mb-6 medical-card-glow bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="text-center space-y-6">
            <div className="relative">
              <div className={`p-4 rounded-full bg-primary/10 inline-block transition-transform duration-500 ${
                animationStep === 0 ? 'scale-110' : 'scale-100'
              }`}>
                <Upload className="h-12 w-12 text-primary" />
              </div>
              {animationStep === 1 && (
                <div className="absolute -top-2 -right-2 animate-bounce">
                  <Sparkles className="h-6 w-6 text-yellow-500" />
                </div>
              )}
            </div>
            
            <div>
              <h3 className="medical-heading text-xl mb-2">Start Your Digital Health Journey</h3>
              <p className="medical-label text-center max-w-md mx-auto">
                Upload your first medical document to begin building your comprehensive health record. 
                Our AI will automatically organize and extract insights from your documents.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {uploadMethods.map((method, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-all cursor-pointer hover:bg-accent/50 ${
                    animationStep === index ? 'ring-2 ring-primary/20 border-primary/50' : ''
                  }`}
                  onClick={method.action}
                >
                  <div className={`w-8 h-8 rounded-lg ${method.color} flex items-center justify-center mb-3 mx-auto`}>
                    <method.icon className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="medical-heading-sm text-center">{method.title}</h4>
                  <p className="text-xs medical-label text-center mt-1">{method.description}</p>
                </div>
              ))}
            </div>

            <Button size="lg" onClick={() => navigate("/upload")} className="group">
              <Upload className="h-5 w-5 mr-2 group-hover:animate-bounce" />
              Upload Your First Document
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 medical-card-glow bg-gradient-to-r from-accent/30 to-primary/10">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <Upload className="h-6 w-6 text-primary" />
              <div>
                <h3 className="medical-heading">Keep Building Your Health Record</h3>
                <p className="medical-label">Add more documents to get better AI insights</p>
              </div>
            </div>

            {showGamification && nextLevel && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="medical-label">
                    {currentLevel.title} → {nextLevel.title}
                  </span>
                  <span className="medical-label">
                    {totalReports}/{nextLevel.threshold} documents
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs medical-label">
                  {nextLevel.threshold - totalReports} more documents to reach {nextLevel.title}
                </p>
              </div>
            )}
          </div>

          <div className="flex space-x-2 ml-6">
            <Button variant="outline" onClick={() => navigate("/upload")}>
              <FileText className="h-4 w-4 mr-2" />
              Upload File
            </Button>
            <Button onClick={() => navigate("/upload")}>
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}