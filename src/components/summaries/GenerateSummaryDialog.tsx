import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { 
  Brain, 
  AlertTriangle, 
  TrendingUp, 
  Stethoscope,
  FileText,
  Loader2
} from "lucide-react";
import { Summary } from "@/types/summary";

interface Report {
  id: string;
  title: string;
  report_date: string;
  report_type: string;
  ocr_status: string;
  physician_name?: string;
}

interface GenerateSummaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (reportIds: string[], summaryType: Summary['summary_type'], customPrompt?: string) => Promise<any>;
  loading: boolean;
}

const summaryTypes = [
  {
    type: 'comprehensive' as const,
    icon: Brain,
    title: 'Comprehensive Summary',
    description: 'Complete overview of all findings, normal and abnormal results',
    color: 'bg-blue-500'
  },
  {
    type: 'abnormal_findings' as const,
    icon: AlertTriangle,
    title: 'Abnormal Findings',
    description: 'Focus on concerning findings that need attention',
    color: 'bg-orange-500'
  },
  {
    type: 'trend_analysis' as const,
    icon: TrendingUp,
    title: 'Trend Analysis',
    description: 'Compare results across multiple reports over time',
    color: 'bg-green-500'
  },
  {
    type: 'doctor_prep' as const,
    icon: Stethoscope,
    title: 'Doctor Visit Prep',
    description: 'Questions and topics to discuss with your physician',
    color: 'bg-purple-500'
  }
];

export function GenerateSummaryDialog({ 
  isOpen, 
  onClose, 
  onGenerate, 
  loading 
}: GenerateSummaryDialogProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<Summary['summary_type']>('comprehensive');
  const [customPrompt, setCustomPrompt] = useState('');
  const [loadingReports, setLoadingReports] = useState(false);

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('id, title, report_date, report_type, ocr_status, physician_name')
        .eq('ocr_status', 'completed')
        .order('report_date', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReports();
    }
  }, [isOpen]);

  const handleReportToggle = (reportId: string) => {
    setSelectedReports(prev => 
      prev.includes(reportId)
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  const handleGenerate = async () => {
    if (selectedReports.length === 0) return;
    
    try {
      await onGenerate(selectedReports, selectedType, customPrompt || undefined);
      onClose();
      // Reset form
      setSelectedReports([]);
      setCustomPrompt('');
      setSelectedType('comprehensive');
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedReports([]);
    setCustomPrompt('');
    setSelectedType('comprehensive');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate AI Summary</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Type Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Choose Summary Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summaryTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Card
                    key={type.type}
                    className={`cursor-pointer transition-colors ${
                      selectedType === type.type 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-accent/50'
                    }`}
                    onClick={() => setSelectedType(type.type)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${type.color} bg-opacity-10`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{type.title}</CardTitle>
                          <CardDescription className="text-sm">
                            {type.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Report Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Select Reports ({selectedReports.length} selected)
            </h3>
            
            {loadingReports ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading your reports...</p>
              </div>
            ) : reports.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    No processed reports available. Upload and process some reports first.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {reports.map((report) => (
                  <Card key={report.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedReports.includes(report.id)}
                        onCheckedChange={() => handleReportToggle(report.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">{report.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {report.report_type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(report.report_date).toLocaleDateString()}
                          {report.physician_name && ` • Dr. ${report.physician_name}`}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Custom Prompt (Optional) */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Custom Instructions (Optional)</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Provide specific questions or areas you'd like the AI to focus on
            </p>
            <Textarea
              placeholder="e.g., Focus on cardiovascular health, explain any changes since my last visit..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={selectedReports.length === 0 || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate Summary
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}