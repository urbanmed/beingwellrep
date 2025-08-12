import React, { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, Clock, FileText } from 'lucide-react';

interface UploadProgressProps {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  processingStage?: string;
  estimatedTimeRemaining?: number;
}

const EnhancedUploadProgress: React.FC<UploadProgressProps> = ({
  fileName,
  progress,
  status,
  processingStage,
  estimatedTimeRemaining
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);

  // Smooth progress animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return processingStage || 'Processing...';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error occurred';
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{fileName}</p>
            <div className="flex items-center gap-2 mt-1">
              {getStatusIcon()}
              <span className="text-sm text-muted-foreground">{getStatusText()}</span>
              {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
                <Badge variant="outline" className="text-xs">
                  {formatTime(estimatedTimeRemaining)} remaining
                </Badge>
              )}
            </div>
          </div>
          <Badge 
            variant={status === 'completed' ? 'default' : status === 'error' ? 'destructive' : 'secondary'}
            className="shrink-0"
          >
            {Math.round(displayProgress)}%
          </Badge>
        </div>
        
        <Progress 
          value={displayProgress} 
          className="h-2"
        />
        
        {/* Processing stages indicator */}
        {status === 'processing' && (
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className={displayProgress >= 25 ? 'text-primary' : ''}>
                ✓ Upload Complete
              </span>
              <span className={displayProgress >= 50 ? 'text-primary' : ''}>
                {displayProgress >= 50 ? '✓' : '○'} Text Extraction
              </span>
              <span className={displayProgress >= 75 ? 'text-primary' : ''}>
                {displayProgress >= 75 ? '✓' : '○'} AI Analysis
              </span>
              <span className={displayProgress >= 100 ? 'text-primary' : ''}>
                {displayProgress >= 100 ? '✓' : '○'} Indexing
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedUploadProgress;