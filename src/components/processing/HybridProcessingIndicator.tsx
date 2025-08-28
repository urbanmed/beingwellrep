import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Zap, Brain, Merge } from "lucide-react";

interface HybridProcessingIndicatorProps {
  stage: string | null;
  progress: {
    ocrComplete: boolean;
    awsEntitiesExtracted: boolean;
    terminologyValidated: boolean;
    llmEnhanced: boolean;
    resultsmerged: boolean;
  };
  isVisible: boolean;
}

export function HybridProcessingIndicator({ 
  stage, 
  progress, 
  isVisible 
}: HybridProcessingIndicatorProps) {
  if (!isVisible) return null;

  const getStageDescription = (currentStage: string | null) => {
    switch (currentStage) {
      case 'initializing':
        return 'Initializing hybrid processing pipeline...';
      case 'ocr':
        return 'Extracting text and structured data with AWS Textract...';
      case 'entity_extraction':
        return 'Identifying medical entities with AWS Comprehend Medical...';
      case 'llm_enhancement':
        return 'Enhancing with AI contextual understanding...';
      case 'merging_results':
        return 'Intelligently merging AWS and AI results...';
      case 'completed':
        return 'Hybrid processing completed successfully!';
      case 'error':
        return 'Processing encountered an error';
      default:
        return 'Processing document...';
    }
  };

  const calculateOverallProgress = () => {
    const steps = Object.values(progress);
    const completedSteps = steps.filter(Boolean).length;
    return (completedSteps / steps.length) * 100;
  };

  const processingSteps = [
    {
      key: 'ocrComplete',
      label: 'Enhanced OCR',
      icon: Zap,
      completed: progress.ocrComplete,
      description: 'AWS Textract + Google Vision'
    },
    {
      key: 'awsEntitiesExtracted',
      label: 'Medical Entities',
      icon: Brain,
      completed: progress.awsEntitiesExtracted,
      description: 'AWS Comprehend Medical'
    },
    {
      key: 'terminologyValidated',
      label: 'Terminology',
      icon: CheckCircle2,
      completed: progress.terminologyValidated,
      description: 'Medical validation'
    },
    {
      key: 'llmEnhanced',
      label: 'AI Enhancement',
      icon: Brain,
      completed: progress.llmEnhanced,
      description: 'GPT contextual analysis'
    },
    {
      key: 'resultsmerged',
      label: 'Result Merging',
      icon: Merge,
      completed: progress.resultsmerged,
      description: 'Intelligent combination'
    }
  ];

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-background">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Hybrid Processing Pipeline</h3>
        <Badge variant={stage === 'completed' ? 'success' : 'secondary'}>
          {stage === 'completed' ? 'Complete' : 'Processing'}
        </Badge>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{getStageDescription(stage)}</span>
          <span>{Math.round(calculateOverallProgress())}%</span>
        </div>
        <Progress value={calculateOverallProgress()} className="h-2" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {processingSteps.map((step) => {
          const Icon = step.icon;
          const isActive = !step.completed && 
            ((step.key === 'ocrComplete' && ['initializing', 'ocr'].includes(stage || '')) ||
             (step.key === 'awsEntitiesExtracted' && stage === 'entity_extraction') ||
             (step.key === 'llmEnhanced' && stage === 'llm_enhancement') ||
             (step.key === 'resultsmerged' && stage === 'merging_results'));

          return (
            <div
              key={step.key}
              className={`p-2 rounded border text-center transition-colors ${
                step.completed
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : isActive
                  ? 'border-blue-200 bg-blue-50 text-blue-800 animate-pulse'
                  : 'border-muted bg-muted/50 text-muted-foreground'
              }`}
            >
              <div className="flex flex-col items-center space-y-1">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium">{step.label}</span>
                <span className="text-xs opacity-75">{step.description}</span>
              </div>
            </div>
          );
        })}
      </div>
      
      {stage === 'error' && (
        <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
          Processing failed. The system will attempt fallback methods automatically.
        </div>
      )}
    </div>
  );
}