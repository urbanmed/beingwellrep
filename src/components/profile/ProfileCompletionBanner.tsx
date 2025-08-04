import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, X, ArrowRight } from "lucide-react";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";

export function ProfileCompletionBanner() {
  const { status, isLoading } = useProfileCompletion();
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();

  if (isLoading || status.isComplete || isDismissed) {
    return null;
  }

  const handleCompleteProfile = () => {
    // Determine which step to start from based on completed sections
    if (!status.completedSections.basicInfo) {
      navigate("/onboarding");
    } else if (!status.completedSections.emergencyContact) {
      navigate("/profile/edit?tab=emergency");
    } else if (!status.completedSections.privacySettings) {
      navigate("/profile/edit?tab=privacy");
    } else {
      navigate("/profile/edit");
    }
  };

  return (
    <Card className="border-warning bg-warning/5 animate-fade-in">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-sm font-medium">Complete Your Profile</h3>
                <p className="text-sm text-muted-foreground">
                  Finish setting up your profile to get personalized health insights
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress</span>
                  <span className="font-medium">{status.completionPercentage}%</span>
                </div>
                <Progress value={status.completionPercentage} className="h-2" />
              </div>

              <div className="flex flex-wrap gap-2">
                {Object.entries(status.completedSections).map(([section, completed]) => (
                  <Badge
                    key={section}
                    variant={completed ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {completed && <CheckCircle className="h-3 w-3 mr-1" />}
                    {section.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </Badge>
                ))}
              </div>

              <Button size="sm" onClick={handleCompleteProfile} className="w-full sm:w-auto">
                Continue Setup
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="text-muted-foreground hover:text-foreground -mr-2 -mt-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}