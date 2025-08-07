import { CheckCircle, AlertCircle, Clock, FileText, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface UploadProgressProps {
  files: Array<{
    name: string;
    status: 'uploading' | 'processing' | 'completed' | 'failed' | 'uploaded';
    progress: number;
    reportId?: string;
    error?: string;
    message?: string;
  }>;
}

export function UploadProgress({ files }: UploadProgressProps) {
  if (files.length === 0) return null;

  const getStatusIcon = (status: 'uploading' | 'processing' | 'completed' | 'failed' | 'uploaded') => {
    switch (status) {
      case 'uploading':
        return <Upload className="h-4 w-4 text-blue-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'uploaded':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: 'uploading' | 'processing' | 'completed' | 'failed' | 'uploaded') => {
    switch (status) {
      case 'uploading':
        return <Badge variant="secondary">Uploading</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700">Processing</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case 'uploaded':
        return <Badge variant="default" className="bg-blue-500">Uploaded</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
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
            
            {file.error ? (
              <p className="text-xs text-red-500">{file.error}</p>
            ) : file.message ? (
              <p className="text-xs text-blue-600">{file.message}</p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}