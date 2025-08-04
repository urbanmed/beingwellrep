import { useState, useCallback, useEffect, useRef } from 'react';
import { Upload as UploadIcon, FileText, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface FileUploadAreaProps {
  onFileSelect: (files: File[]) => void;
  isUploading: boolean;
  uploadProgress: number;
  maxFiles?: number;
  acceptedTypes?: string[];
}

export function FileUploadArea({ 
  onFileSelect, 
  isUploading, 
  uploadProgress,
  maxFiles = 5,
  acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
}: FileUploadAreaProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragValidation, setDragValidation] = useState<{ valid: boolean; message: string } | null>(null);
  const { toast } = useToast();
  const dragCounterRef = useRef(0);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return `File type ${file.type} not supported. Please use PDF or image files.`;
    }
    
    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return 'File size must be less than 50MB';
    }
    
    return null;
  };

  const handleFiles = useCallback((files: File[]) => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    }

    // Check total file count
    if (selectedFiles.length + validFiles.length > maxFiles) {
      errors.push(`You can only upload up to ${maxFiles} files at once`);
      return;
    }

    if (errors.length > 0) {
      toast({
        title: 'File validation failed',
        description: errors.join('\n'),
        variant: 'destructive',
      });
      return;
    }

    const newFiles = [...selectedFiles, ...validFiles];
    setSelectedFiles(newFiles);
    onFileSelect(newFiles);
  }, [selectedFiles, maxFiles, acceptedTypes, onFileSelect, toast]);

  // Validate files during drag for immediate feedback
  const validateDraggedFiles = useCallback((files: FileList) => {
    const fileArray = Array.from(files);
    const errors: string[] = [];
    let validCount = 0;

    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validCount++;
      }
    }

    // Check total file count
    if (selectedFiles.length + validCount > maxFiles) {
      errors.push(`You can only upload up to ${maxFiles} files at once`);
    }

    if (errors.length > 0) {
      return { valid: false, message: `Invalid files detected: ${errors.slice(0, 2).join(', ')}${errors.length > 2 ? '...' : ''}` };
    }

    return { valid: true, message: `${validCount} valid file${validCount !== 1 ? 's' : ''} ready to upload` };
  }, [selectedFiles.length, maxFiles, validateFile]);

  // Document-level drag event handlers
  useEffect(() => {
    const handleDocumentDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDocumentDrop = (e: DragEvent) => {
      e.preventDefault();
    };

    document.addEventListener('dragover', handleDocumentDragOver);
    document.addEventListener('drop', handleDocumentDrop);

    return () => {
      document.removeEventListener('dragover', handleDocumentDragOver);
      document.removeEventListener('drop', handleDocumentDrop);
    };
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounterRef.current++;
    
    if (dragCounterRef.current === 1) {
      setDragActive(true);
      
      // Validate files for immediate feedback
      if (e.dataTransfer.files.length > 0) {
        const validation = validateDraggedFiles(e.dataTransfer.files);
        setDragValidation(validation);
      }
    }
  }, [validateDraggedFiles]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounterRef.current--;
    
    if (dragCounterRef.current === 0) {
      setDragActive(false);
      setDragValidation(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Update validation if files changed
    if (e.dataTransfer.files.length > 0) {
      const validation = validateDraggedFiles(e.dataTransfer.files);
      setDragValidation(validation);
    }
  }, [validateDraggedFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounterRef.current = 0;
    setDragActive(false);
    setDragValidation(null);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [handleFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  }, [handleFiles]);

  const removeFile = useCallback((index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFileSelect(newFiles);
  }, [selectedFiles, onFileSelect]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <Card 
        className={`relative border-2 border-dashed transition-all duration-200 ${
          dragActive 
            ? 'border-primary bg-primary/5 scale-[1.02]' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/40'
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        ref={dropZoneRef}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <UploadIcon className={`h-12 w-12 mb-4 transition-colors ${
            dragActive ? 'text-primary' : 'text-muted-foreground'
          }`} />
          
          <h3 className="text-lg font-semibold mb-2">
            {dragActive ? 'Drop files here' : 'Upload Medical Documents'}
          </h3>
          
          <p className="text-muted-foreground mb-4">
            {dragActive 
              ? 'Release to upload files' 
              : `Drag & drop files here, or click to select (max ${maxFiles} files)`
            }
          </p>

          {/* Drag Validation Feedback */}
          {dragActive && dragValidation && (
            <div className={`flex items-center space-x-2 mb-4 p-2 rounded-md ${
              dragValidation.valid 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {dragValidation.valid ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">{dragValidation.message}</span>
            </div>
          )}
          
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            disabled={isUploading}
          />
          
          <Button 
            onClick={() => document.getElementById('file-upload')?.click()}
            disabled={isUploading}
            className="mb-2"
          >
            Choose Files
          </Button>
          
          <p className="text-xs text-muted-foreground">
            Supported: PDF, JPEG, PNG, WebP (max 50MB each)
          </p>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {isUploading && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">Uploading files...</p>
                <Progress value={uploadProgress} className="h-2" />
              </div>
              <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Files List */}
      {selectedFiles.length > 0 && !isUploading && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Selected Files ({selectedFiles.length})</h4>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}