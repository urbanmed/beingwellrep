import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, Clock, FileText, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BatchFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  reportId?: string;
  error?: string;
}

interface BatchProcessingPanelProps {
  files: File[];
  onComplete?: (results: { successful: number; failed: number }) => void;
  onClose?: () => void;
}

export const BatchProcessingPanel: React.FC<BatchProcessingPanelProps> = ({
  files,
  onComplete,
  onClose
}) => {
  const [batchFiles, setBatchFiles] = useState<BatchFile[]>(
    files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending',
      progress: 0
    }))
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const { toast } = useToast();

  const updateFileStatus = (fileId: string, updates: Partial<BatchFile>) => {
    setBatchFiles(prev => 
      prev.map(file => 
        file.id === fileId ? { ...file, ...updates } : file
      )
    );
  };

  const updateOverallProgress = () => {
    const totalFiles = batchFiles.length;
    const completedFiles = batchFiles.filter(f => 
      f.status === 'completed' || f.status === 'error'
    ).length;
    
    setOverallProgress((completedFiles / totalFiles) * 100);
  };

  const processFile = async (batchFile: BatchFile): Promise<void> => {
    const { file } = batchFile;
    
    try {
      // Update status to uploading
      updateFileStatus(batchFile.id, { status: 'uploading', progress: 25 });

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('medical-documents')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      updateFileStatus(batchFile.id, { status: 'processing', progress: 50 });

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create report entry
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .insert({
          user_id: user.id,
          title: file.name,
          file_name: file.name,
          file_url: filePath,
          file_size: file.size,
          file_type: file.type,
          report_date: new Date().toISOString().split('T')[0],
          parsing_status: 'pending'
        })
        .select()
        .single();

      if (reportError) {
        throw new Error(`Report creation failed: ${reportError.message}`);
      }

      updateFileStatus(batchFile.id, { 
        status: 'processing', 
        progress: 75,
        reportId: reportData.id 
      });

      // Add to processing queue
      const { error: queueError } = await supabase
        .from('processing_queue')
        .insert({
          user_id: user.id,
          report_id: reportData.id,
          status: 'queued',
          priority: 1,
          metadata: {
            batchProcessing: true,
            batchId: Date.now().toString()
          }
        });

      if (queueError) {
        throw new Error(`Queue submission failed: ${queueError.message}`);
      }

      // Mark as completed
      updateFileStatus(batchFile.id, { status: 'completed', progress: 100 });

    } catch (error) {
      console.error('File processing error:', error);
      updateFileStatus(batchFile.id, { 
        status: 'error', 
        progress: 0,
        error: error instanceof Error ? error.message : 'Processing failed'
      });
    }
  };

  const startBatchProcessing = async () => {
    setIsProcessing(true);
    
    try {
      // Process files concurrently (limit to 3 at a time to avoid overwhelming the system)
      const batches = [];
      for (let i = 0; i < batchFiles.length; i += 3) {
        batches.push(batchFiles.slice(i, i + 3));
      }

      for (const batch of batches) {
        await Promise.all(batch.map(processFile));
      }

      // Update overall progress
      updateOverallProgress();

      const successful = batchFiles.filter(f => f.status === 'completed').length;
      const failed = batchFiles.filter(f => f.status === 'error').length;

      toast({
        title: "Batch Processing Complete",
        description: `${successful} files processed successfully, ${failed} failed`,
        variant: successful > 0 && failed === 0 ? "default" : "destructive"
      });

      onComplete?.({ successful, failed });

    } catch (error) {
      console.error('Batch processing error:', error);
      toast({
        title: "Batch Processing Failed",
        description: "An error occurred during batch processing",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFile = (fileId: string) => {
    setBatchFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getStatusIcon = (status: BatchFile['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'uploading':
      case 'processing':
        return <Upload className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadgeVariant = (status: BatchFile['status']) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'error':
        return 'destructive';
      case 'processing':
      case 'uploading':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const completedCount = batchFiles.filter(f => f.status === 'completed').length;
  const errorCount = batchFiles.filter(f => f.status === 'error').length;
  const processingCount = batchFiles.filter(f => 
    f.status === 'uploading' || f.status === 'processing'
  ).length;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Batch Processing
          </CardTitle>
          <CardDescription>
            Processing {batchFiles.length} files
          </CardDescription>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isProcessing}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="w-full" />
        </div>

        {/* Status Summary */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>{completedCount} Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <Upload className="h-4 w-4 text-blue-500" />
            <span>{processingCount} Processing</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span>{errorCount} Failed</span>
          </div>
        </div>

        {/* File List */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {batchFiles.map((batchFile) => (
            <div key={batchFile.id} className="flex items-center gap-3 p-3 border rounded-lg">
              {getStatusIcon(batchFile.status)}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{batchFile.file.name}</span>
                  <Badge variant={getStatusBadgeVariant(batchFile.status)}>
                    {batchFile.status}
                  </Badge>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {(batchFile.file.size / 1024 / 1024).toFixed(2)} MB
                </div>
                
                {batchFile.error && (
                  <div className="text-sm text-red-500 mt-1">
                    {batchFile.error}
                  </div>
                )}
              </div>

              {(batchFile.status === 'uploading' || batchFile.status === 'processing') && (
                <div className="w-20">
                  <Progress value={batchFile.progress} className="h-2" />
                </div>
              )}

              {batchFile.status === 'pending' && !isProcessing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(batchFile.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          {!isProcessing && (
            <Button
              onClick={startBatchProcessing}
              disabled={batchFiles.length === 0}
            >
              Start Processing
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};