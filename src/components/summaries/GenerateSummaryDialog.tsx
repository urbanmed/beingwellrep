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

const COMPREHENSIVE_PROMPT_TEMPLATE = `When generating comprehensive AI summary use the following prompt, Keep the background accent color for priority sections, font size and type same as now.

# TASK: Analyze any uploaded medical report (all categories) and give structured health risk insights with priority levels

You will be given a **medical report** as input (PDF or text). It could be from any of the following categories:

🩸 Blood Tests – CBC, LFT, KFT, Lipid, Glucose, HbA1c, Vitamins, Minerals, Inflammatory markers, etc.  
🧬 Genetic Reports – DNA analysis, genetic predisposition, carrier status, pharmacogenomics, ancestry-related health markers.  
🧪 Thyroid / Hormone – Thyroid panel (T3, T4, TSH, Free T3/T4), reproductive hormones, cortisol, insulin, growth hormone, etc.  
🫀 Heart & Cardiac – ECG/EKG reports, echocardiograms, cardiac enzyme tests (troponin, CK-MB), cholesterol subfractions, stress test results.  
🧠 Neurology – Brain imaging summaries (MRI, CT), nerve conduction studies, EEG, neurological biomarker blood panels.  
🍽️ Nutrition / Diet – Macro & micronutrient analysis, vitamin & mineral status, amino acid profile, fatty acid profile.  
🧫 Microbiome / Gut – Stool analysis, gut bacteria diversity, dysbiosis markers, pathogen detection, digestive enzyme levels.  
⚙️ Other / Miscellaneous – Any other type of diagnostic report not covered above.

---

## INSTRUCTIONS

1. **Detect the type(s) of report** based on content.
2. **Identify all test panels or sections** present.
3. For each panel:
   - List **Tests Included**
   - Extract **values, units, and reference ranges** where available
   - Compare with reference ranges
   - Interpret each value as: Normal, Borderline, Mildly Abnormal, Clinically Concerning
4. **Flag abnormalities or borderline values** and:
   - Assign a **Priority Level**:
     - **High Priority** – Critical or urgent health concern; may require immediate medical attention
     - **Medium Priority** – Significant finding; needs timely follow-up but not immediately life-threatening
     - **Low Priority** – Mild or early-stage deviation; can be monitored and managed with lifestyle/dietary changes
5. For each flagged finding, provide a **short recommendation** based on its priority.
6. **Assign a Risk Score (1–100)** for each organ/system or functional category.
7. **Generate an Overall Health Risk Score (1–100)** based on weighted averages of category scores.

---

## OUTPUT FORMAT

CATEGORY: [Name]
Tests Included: [list]
Key Findings: [summarize abnormal/borderline results]
Interpretation: [brief but clear medical interpretation]
Risk Score: X/100

🔴 High Priority Findings:

[Finding]: [Brief explanation] → Recommendation: [Action step]

🟠 Medium Priority Findings:

[Finding]: [Brief explanation] → Recommendation: [Action step]

🟢 Low Priority Findings:

[Finding]: [Brief explanation] → Recommendation: [Action step]


Repeat for **each detected category**.

---

At the end, include:

OVERALL HEALTH RISK SCORE: XX/100
🧭 Summary of Flagged Issues:

Bullet points summarizing main risks

📌 Suggested Next Steps:

[Lifestyle, diet, further testing, and/or specialist referrals]

---

⚠️ Notes:
- Keep explanations factual and easy for non-medical readers.
- If no abnormal findings in a category, state: “All values within normal range.”
- If insufficient data, state: “Not enough data to assess.”
- Do not provide a medical diagnosis; focus on **risk awareness, prioritization, and recommendations**.

This now ensures:

Multi-category adaptability

Risk scoring + Priority classification

Clear action-oriented recommendations per priority level`;

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
  const { retryOCR } = useReports();

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

  // Prefill the custom prompt when Comprehensive type is selected
  useEffect(() => {
    if (isOpen && selectedType === 'comprehensive' && !customPrompt) {
      setCustomPrompt(COMPREHENSIVE_PROMPT_TEMPLATE);
    }
  }, [isOpen, selectedType]);

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

  const handleRetryOCR = async (reportId: string) => {
    try {
      await retryOCR(reportId);
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
                    <h4 className="font-medium text-sm text-green-600 mb-2 flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      Ready for Summary ({readyReports.length})
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {readyReports.map((report) => (
                        <Card key={report.id} className="p-3">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedReports.includes(report.id)}
                              onCheckedChange={() => handleReportToggle(report.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-medium text-sm truncate">{report.title}</h5>
                                <Badge variant="outline" className="text-xs">
                                  {report.report_type}
                                </Badge>
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                  Ready
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
                  </div>
                )}

                {/* Processing Reports */}
                {processingReports.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-blue-600 mb-2 flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      Processing ({processingReports.length})
                    </h4>
                    <div className="space-y-2">
                      {processingReports.map((report) => (
                        <Card key={report.id} className="p-3 bg-blue-50">
                          <div className="flex items-center gap-3">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-medium text-sm truncate">{report.title}</h5>
                                <Badge variant="outline" className="text-xs">
                                  {report.report_type}
                                </Badge>
                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                  Processing
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Text extraction in progress...
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Failed Reports */}
                {failedReports.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-red-600 mb-2 flex items-center">
                      <XCircle className="h-4 w-4 mr-1" />
                      Processing Failed ({failedReports.length})
                    </h4>
                    <div className="space-y-2">
                      {failedReports.map((report) => (
                        <Card key={report.id} className="p-3 bg-red-50">
                          <div className="flex items-center gap-3">
                            <XCircle className="h-4 w-4 text-red-600" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-medium text-sm truncate">{report.title}</h5>
                                <Badge variant="outline" className="text-xs">
                                  {report.report_type}
                                </Badge>
                                <Badge variant="destructive" className="text-xs">
                                  Failed
                                </Badge>
                              </div>
                              <p className="text-xs text-red-600 mb-2">
                                {report.processing_error || 'Processing failed'}
                              </p>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-6 text-xs"
                                onClick={() => handleRetryOCR(report.id)}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Retry
                              </Button>
                            </div>
                          </div>
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
              disabled={selectedReports.length === 0 || loading || !onGenerate || readyReports.length === 0}
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