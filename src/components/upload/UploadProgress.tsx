import { CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface UploadProgressProps {
  files: Array<{
    name: string;
    status: 'uploading' | 'processing' | 'completed' | 'failed';
    progress: number;
    reportId?: string;
    error?: string;
  }>;
}

export function UploadProgress({ files }: UploadProgressProps) {
  if (files.length === 0) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing OCR</Badge>;
      case 'uploading':
        return <Badge variant="secondary">Uploading</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Upload Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {files.map((file, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(file.status)}
                <span className="text-sm font-medium truncate max-w-[200px]">
                  {file.name}
                </span>
              </div>
              {getStatusBadge(file.status)}
            </div>
            
            {(file.status === 'uploading' || file.status === 'processing') && (
              <Progress value={file.progress} className="h-2" />
            )}
            
            {file.error && (
              <p className="text-xs text-red-500">{file.error}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}