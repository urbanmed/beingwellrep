import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, RefreshCw, ExternalLink } from "lucide-react";
import { useReports } from "@/hooks/useReports";
import { useMemo, useState } from "react";

interface HealthTip {
  id: string;
  title: string;
  content: string;
  category: 'general' | 'lab' | 'prescription' | 'lifestyle';
  priority: 'info' | 'important';
  source?: string;
}

export function PersonalizedTipsHealth() {
  const { reports } = useReports();
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const personalizedTips = useMemo(() => {
    const tips: HealthTip[] = [];
    
    // Analyze recent reports for personalized recommendations
    const recentReports = reports
      .filter(r => r.parsing_status === 'completed')
      .slice(0, 5);

    // Generic health tips that apply to everyone
    const generalTips: HealthTip[] = [
      {
        id: 'hydration',
        title: 'Stay Hydrated',
        content: 'Aim for 8 glasses of water daily. Proper hydration supports all bodily functions.',
        category: 'lifestyle',
        priority: 'info'
      },
      {
        id: 'sleep',
        title: 'Prioritize Sleep',
        content: 'Get 7-9 hours of quality sleep each night for optimal health and recovery.',
        category: 'lifestyle',
        priority: 'info'
      },
      {
        id: 'exercise',
        title: 'Move Daily',
        content: 'Aim for at least 30 minutes of moderate exercise most days of the week.',
        category: 'lifestyle',
        priority: 'info'
      },
      {
        id: 'nutrition',
        title: 'Balanced Nutrition',
        content: 'Include a variety of fruits, vegetables, and whole grains in your diet.',
        category: 'lifestyle',
        priority: 'info'
      }
    ];

    // Add report-specific tips
    if (recentReports.some(r => r.report_type === 'lab')) {
      tips.push({
        id: 'lab-follow',
        title: 'Review Lab Results',
        content: 'Schedule a follow-up with your doctor to discuss your recent lab results.',
        category: 'lab',
        priority: 'important'
      });
    }

    if (recentReports.some(r => r.report_type === 'prescription')) {
      tips.push({
        id: 'medication-compliance',
        title: 'Medication Adherence',
        content: 'Take medications exactly as prescribed and set reminders if needed.',
        category: 'prescription',
        priority: 'important'
      });
    }

    // Check for patterns in extracted text that might suggest specific tips
    const extractedTexts = recentReports
      .map(r => r.extracted_text?.toLowerCase())
      .filter(Boolean);

    if (extractedTexts.some(text => text?.includes('cholesterol') || text?.includes('lipid'))) {
      tips.push({
        id: 'heart-health',
        title: 'Heart Health Focus',
        content: 'Consider a heart-healthy diet with omega-3 fatty acids and regular cardio exercise.',
        category: 'lab',
        priority: 'important'
      });
    }

    if (extractedTexts.some(text => text?.includes('blood pressure') || text?.includes('hypertension'))) {
      tips.push({
        id: 'blood-pressure',
        title: 'Monitor Blood Pressure',
        content: 'Regular monitoring and lifestyle changes can help manage blood pressure.',
        category: 'general',
        priority: 'important'
      });
    }

    // Combine personalized and general tips
    const allTips = [...tips, ...generalTips];
    
    // Shuffle and return a subset
    return allTips.sort(() => Math.random() - 0.5).slice(0, 6);
  }, [reports]);

  const currentTip = personalizedTips[currentTipIndex] || personalizedTips[0];

  const nextTip = () => {
    setCurrentTipIndex((prev) => (prev + 1) % personalizedTips.length);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'lab': return 'default';
      case 'prescription': return 'success';
      case 'lifestyle': return 'warning';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    return priority === 'important' ? 'destructive' : 'outline';
  };

  if (!currentTip) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="medical-heading-sm flex items-center">
            <Lightbulb className="h-4 w-4 mr-2 text-primary" />
            Health Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="medical-annotation text-center py-4">
            Upload more reports for personalized health tips
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="medical-heading-sm flex items-center justify-between">
          <div className="flex items-center">
            <Lightbulb className="h-4 w-4 mr-2 text-primary" />
            Health Tips
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={getPriorityColor(currentTip.priority)} className="text-xs">
              {currentTip.priority}
            </Badge>
            {personalizedTips.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={nextTip}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="medical-label font-medium">{currentTip.title}</h4>
            <Badge variant={getCategoryColor(currentTip.category)} className="text-xs capitalize">
              {currentTip.category}
            </Badge>
          </div>
          
          <p className="medical-annotation leading-relaxed">{currentTip.content}</p>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="medical-annotation">
            {currentTipIndex + 1} of {personalizedTips.length}
          </span>
          {currentTip.source && (
            <Button variant="ghost" size="sm" className="text-xs">
              <ExternalLink className="h-3 w-3 mr-1" />
              Learn more
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}