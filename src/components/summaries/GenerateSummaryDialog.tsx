import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useReports } from "@/hooks/useReports";
import { 
  Brain, 
  AlertTriangle, 
  TrendingUp, 
  Stethoscope,
  FileText,
  Loader2,
  RefreshCw,
  Clock,
  XCircle
} from "lucide-react";
import { Summary } from "@/types/summary";

interface ReportDisplay {
  id: string;
  title: string;
  report_date: string;
  report_type: string;
  parsing_status: string;
  extracted_text?: string;
  physician_name?: string;
  processing_error?: string;
}

interface GenerateSummaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate?: (reportIds: string[], summaryType: Summary['summary_type'], customPrompt?: string) => Promise<any>;
  loading?: boolean;
  preSelectedReportIds?: string[];
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
  loading = false,
  preSelectedReportIds = []
}: GenerateSummaryDialogProps) {
  const [allReports, setAllReports] = useState<ReportDisplay[]>([]);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<Summary['summary_type']>('comprehensive');
  const [customPrompt, setCustomPrompt] = useState('');
  const [loadingReports, setLoadingReports] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { retryProcessing } = useReports();

  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('id, title, report_date, report_type, parsing_status, physician_name, extracted_text, processing_error')
        .order('report_date', { ascending: false });

      if (error) throw error;
      setAllReports((data || []) as ReportDisplay[]);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setFetchError('Failed to load reports. Please try again.');
    } finally {
      setLoadingReports(false);
    }
  }, []);

  // Handle dialog opening
  useEffect(() => {
    if (isOpen) {
      fetchReports();
    }
  }, [isOpen, fetchReports]);

  // Handle preselected reports (separate effect to avoid dependency issues)
  useEffect(() => {
    if (isOpen && preSelectedReportIds && preSelectedReportIds.length > 0) {
      setSelectedReports(preSelectedReportIds);
    }
  }, [isOpen, preSelectedReportIds?.length]);

  const handleReportToggle = (reportId: string) => {
    setSelectedReports(prev => 
      prev.includes(reportId)
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  // Filter reports for summary generation
  const readyReports = allReports.filter(r => 
    r.parsing_status === 'completed' && 
    r.extracted_text && 
    r.extracted_text.trim() !== ''
  );

  const processingReports = allReports.filter(r => r.parsing_status === 'processing');
  const failedReports = allReports.filter(r => r.parsing_status === 'failed');

  const handleRetryProcessing = async (reportId: string) => {
    try {
      await retryProcessing(reportId);
      // Refresh the reports list
      await fetchReports();
    } catch (error) {
      // Error is handled by the useReports hook
    }
  };

  const handleGenerate = async () => {
    if (selectedReports.length === 0 || !onGenerate) return;
    
    // Validate that selected reports have OCR text
    const selectedReportData = readyReports.filter(r => selectedReports.includes(r.id));
    const reportsWithoutText = selectedReports.filter(id => 
      !readyReports.some(r => r.id === id)
    );
    
    if (reportsWithoutText.length > 0) {
      setFetchError('Please only select reports that have been fully processed.');
      return;
    }
    
    try {
      await onGenerate(selectedReports, selectedType, customPrompt || undefined);
      onClose();
      // Reset form
      setSelectedReports([]);
      setCustomPrompt('');
      setSelectedType('comprehensive');
      setFetchError(null);
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
      <DialogContent className="max-w-[calc(100vw-2rem)] max-h-[95vh] w-[calc(100vw-2rem)] sm:max-w-4xl sm:max-h-[90vh] sm:w-auto overflow-y-auto p-3 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg sm:text-xl">Generate AI Summary</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-6">
          {/* Summary Type Selection */}
          <div>
            <h3 className="text-sm font-medium mb-3">Choose Summary Type</h3>
            <div className="grid grid-cols-1 gap-2">
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
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${type.color} bg-opacity-10 flex items-center justify-center flex-shrink-0`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{type.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {type.description}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Report Selection */}
          <div>
            <h3 className="text-sm font-medium mb-3">
              Select Reports ({selectedReports.length} selected)
            </h3>
            
            {loadingReports ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading your reports...</p>
              </div>
            ) : fetchError ? (
              <Card>
                <CardContent className="text-center py-8">
                  <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
                  <p className="text-destructive mb-3">{fetchError}</p>
                  <Button onClick={fetchReports} variant="outline" size="sm">
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : allReports.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    No reports found. Upload some medical documents first.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Ready Reports */}
                {readyReports.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-green-600 mb-2 flex items-center">
                      <FileText className="h-3 w-3 mr-1" />
                      Ready for Summary ({readyReports.length})
                    </h4>
                     <div className="space-y-1.5 max-h-[25vh] overflow-y-auto">
                       {readyReports.map((report) => (
                         <Card key={report.id}>
                           <CardContent className="p-1.5 sm:p-3">
                             <div className="flex items-start gap-2">
                               <Checkbox
                                 checked={selectedReports.includes(report.id)}
                                 onCheckedChange={() => handleReportToggle(report.id)}
                                 className="mt-0.5 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0"
                               />
                               <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                 <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                               </div>
                               <div className="flex-1 min-w-0">
                                 <div className="space-y-0.5">
                                   <h5 className="text-xs sm:text-sm font-medium truncate leading-tight">{report.title}</h5>
                                    <div className="flex flex-wrap gap-1">
                                      <Badge variant="outline" className="text-[9px] sm:text-[10px] h-3.5 sm:h-4 px-1 py-0 flex-shrink-0 leading-none">
                                        {report.report_type}
                                      </Badge>
                                      <Badge variant="secondary" className="text-[9px] sm:text-[10px] h-3.5 sm:h-4 bg-green-100 text-green-700 px-1 py-0 flex-shrink-0 leading-none">
                                        Ready
                                      </Badge>
                                    </div>
                                   <p className="text-[10px] sm:text-xs text-muted-foreground truncate leading-tight">
                                     {new Date(report.report_date).toLocaleDateString()}
                                     {report.physician_name && ` • Dr. ${report.physician_name}`}
                                   </p>
                                 </div>
                               </div>
                             </div>
                           </CardContent>
                         </Card>
                       ))}
                     </div>
                  </div>
                )}

                {/* Processing Reports */}
                {processingReports.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-blue-600 mb-2 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Processing ({processingReports.length})
                    </h4>
                     <div className="space-y-2">
                       {processingReports.map((report) => (
                         <Card key={report.id} className="bg-blue-50">
                           <CardContent className="p-2 sm:p-3">
                            <div className="flex items-start gap-3">
                               <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                 <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                               </div>
                               <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-1 mb-1 flex-wrap">
                                   <h5 className="text-sm font-medium truncate">{report.title}</h5>
                                   <Badge variant="outline" className="text-[10px] sm:text-xs h-4 sm:h-5 px-1 sm:px-2">
                                     {report.report_type}
                                   </Badge>
                                   <Badge variant="secondary" className="text-[10px] sm:text-xs h-4 sm:h-5 bg-blue-100 text-blue-700 px-1 sm:px-2">
                                     Processing
                                   </Badge>
                                 </div>
                                 <p className="text-xs text-muted-foreground">
                                   Text extraction in progress...
                                 </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Failed Reports */}
                {failedReports.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-red-600 mb-2 flex items-center">
                      <XCircle className="h-3 w-3 mr-1" />
                      Processing Failed ({failedReports.length})
                    </h4>
                     <div className="space-y-2">
                       {failedReports.map((report) => (
                         <Card key={report.id} className="bg-red-50">
                           <CardContent className="p-2 sm:p-3">
                            <div className="flex items-start gap-3">
                               <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                 <XCircle className="h-4 w-4 text-red-600" />
                               </div>
                               <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-1 mb-1 flex-wrap">
                                   <h5 className="text-sm font-medium truncate">{report.title}</h5>
                                   <Badge variant="outline" className="text-[10px] sm:text-xs h-4 sm:h-5 px-1 sm:px-2">
                                     {report.report_type}
                                   </Badge>
                                   <Badge variant="destructive" className="text-[10px] sm:text-xs h-4 sm:h-5 px-1 sm:px-2">
                                     Failed
                                   </Badge>
                                 </div>
                                 <p className="text-xs text-red-600 mb-2">
                                   {report.processing_error || 'Processing failed'}
                                 </p>
                                 <Button 
                                   size="sm" 
                                   variant="outline" 
                                   className="h-7 w-auto text-xs px-2"
                                   onClick={() => handleRetryProcessing(report.id)}
                                 >
                                   <RefreshCw className="h-3 w-3 mr-1" />
                                   Retry
                                 </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {readyReports.length === 0 && processingReports.length === 0 && failedReports.length === 0 && (
                  <Card>
                    <CardContent className="text-center py-8">
                      <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">
                        No reports available for summary generation.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Custom Prompt (Optional) */}
          <div>
            <h3 className="text-sm font-medium mb-2">Custom Instructions (Optional)</h3>
            <p className="text-xs text-muted-foreground mb-2">
              Provide specific questions or areas you'd like the AI to focus on
            </p>
            <Textarea
              placeholder="e.g., Focus on cardiovascular health, explain any changes since my last visit..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="h-10 text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={selectedReports.length === 0 || loading || !onGenerate || readyReports.length === 0}
              className="h-10 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
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