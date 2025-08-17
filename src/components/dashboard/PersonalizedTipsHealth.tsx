import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Lightbulb, ExternalLink, X } from "lucide-react";
import { useReports } from "@/hooks/useReports";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();
  const [selectedTip, setSelectedTip] = useState<HealthTip | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTipClick = (tip: HealthTip) => {
    if (isMobile) {
      setSelectedTip(tip);
      setIsModalOpen(true);
    }
  };

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
    return allTips.sort(() => Math.random() - 0.5).slice(0, 8);
  }, [reports]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'lab': return 'default';
      case 'prescription': return 'success';
      case 'lifestyle': return 'warning';
      default: return 'secondary';
    }
  };

  const getPriorityBorder = (priority: string) => {
    return priority === 'important' ? 'border-l-destructive' : 'border-l-muted';
  };

  if (personalizedTips.length === 0) {
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
    <div className="space-y-2.5 sm:space-y-3">
      <div className="flex items-center">
        <Lightbulb className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 text-primary" />
        <h3 className="medical-heading-sm">Health Tips</h3>
      </div>
      
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex space-x-2 pb-2">
          {personalizedTips.map((tip) => (
            <Card 
              key={tip.id} 
              className={`flex-none w-[calc((100vw-3rem)/2.2)] min-w-[160px] max-w-[200px] border-l-2 ${getPriorityBorder(tip.priority)} ${isMobile ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
              onClick={() => handleTipClick(tip)}
            >
              <CardHeader className="pb-2 px-3 pt-3">
                <div className="flex items-center justify-between gap-1">
                  <Badge variant={getCategoryColor(tip.category)} className="text-xs px-1 py-0 h-5">
                    {tip.category}
                  </Badge>
                  {tip.priority === 'important' && (
                    <Badge variant="destructive" className="text-xs px-1 py-0 h-5">
                      !
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                <h4 className="text-xs sm:text-sm font-medium leading-relaxed line-clamp-2">{tip.title}</h4>
                <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3 whitespace-normal">
                  {tip.content}
                </p>
                {tip.source && (
                  <Button variant="ghost" size="sm" className="text-[9px] p-0 h-auto mt-1">
                    <ExternalLink className="h-2 w-2 mr-0.5" />
                    More
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Mobile-friendly Modal */}
      {isMobile ? (
        <Drawer open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="pb-4">
              <DrawerTitle className="flex items-center gap-2 text-left">
                <Badge variant={selectedTip ? getCategoryColor(selectedTip.category) : 'secondary'} className="text-xs">
                  {selectedTip?.category}
                </Badge>
                {selectedTip?.priority === 'important' && (
                  <Badge variant="destructive" className="text-xs">
                    Important
                  </Badge>
                )}
              </DrawerTitle>
            </DrawerHeader>
            
            {selectedTip && (
              <div className="px-4 pb-6 space-y-4">
                <h3 className="text-lg font-semibold leading-relaxed">
                  {selectedTip.title}
                </h3>
                
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {selectedTip.content}
                </p>
                
                {selectedTip.source && (
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Learn More
                  </Button>
                )}
              </div>
            )}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-md mx-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Badge variant={selectedTip ? getCategoryColor(selectedTip.category) : 'secondary'} className="text-xs">
                  {selectedTip?.category}
                </Badge>
                {selectedTip?.priority === 'important' && (
                  <Badge variant="destructive" className="text-xs">
                    Important
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            
            {selectedTip && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold leading-relaxed">
                  {selectedTip.title}
                </h3>
                
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {selectedTip.content}
                </p>
                
                {selectedTip.source && (
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Learn More
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}