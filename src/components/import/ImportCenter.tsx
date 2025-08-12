import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Eye,
  Download,
  FileSpreadsheet,
  FileJson
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/hooks/use-toast';

interface ImportFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'validating' | 'ready' | 'importing' | 'completed' | 'error';
  progress: number;
  errors: string[];
  warnings: string[];
  previewData?: any[];
}

const ImportCenter: React.FC = () => {
  const [files, setFiles] = useState<ImportFile[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending' as const,
      progress: 0,
      errors: [],
      warnings: []
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Start validation for each file
    newFiles.forEach(fileData => {
      validateFile(fileData.id, acceptedFiles.find(f => f.name === fileData.name)!);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/pdf': ['.pdf']
    },
    maxSize: 50 * 1024 * 1024 // 50MB
  });

  const validateFile = async (fileId: string, file: File) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'validating', progress: 25 } : f
    ));

    // Simulate validation process
    await new Promise(resolve => setTimeout(resolve, 2000));

    const errors: string[] = [];
    const warnings: string[] = [];

    // Mock validation logic
    if (file.size > 25 * 1024 * 1024) {
      warnings.push('Large file size may take longer to process');
    }

    if (file.name.includes('test')) {
      warnings.push('Filename suggests this might be test data');
    }

    // Mock preview data for JSON/CSV files
    let previewData = undefined;
    if (file.type === 'application/json' || file.type === 'text/csv') {
      previewData = [
        { field1: 'Sample', field2: 'Data', field3: '123' },
        { field1: 'Another', field2: 'Row', field3: '456' }
      ];
    }

    setFiles(prev => prev.map(f => 
      f.id === fileId ? { 
        ...f, 
        status: errors.length > 0 ? 'error' : 'ready',
        progress: errors.length > 0 ? 100 : 75,
        errors,
        warnings,
        previewData
      } : f
    ));
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const startImport = async () => {
    const readyFiles = files.filter(f => f.status === 'ready');
    
    if (readyFiles.length === 0) {
      toast({
        title: "No files ready",
        description: "Please wait for file validation to complete",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);

    for (const file of readyFiles) {
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'importing', progress: 0 } : f
      ));

      // Simulate import process
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, progress } : f
        ));
      }

      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'completed', progress: 100 } : f
      ));
    }

    setIsImporting(false);
    toast({
      title: "Import completed",
      description: `Successfully imported ${readyFiles.length} file(s)`,
    });
  };

  const getStatusIcon = (status: ImportFile['status']) => {
    switch (status) {
      case 'pending':
      case 'validating':
      case 'importing':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />;
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('json')) return <FileJson className="h-4 w-4" />;
    if (type.includes('csv') || type.includes('spreadsheet')) return <FileSpreadsheet className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Data Import Center</h2>
        <p className="text-muted-foreground">
          Import medical records and health data from external sources
        </p>
      </div>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Files for Import</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-lg mb-2">Drag & drop files here, or click to select</p>
                <p className="text-sm text-muted-foreground">
                  Supported formats: JSON, CSV, XLSX, PDF (Max 50MB)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Import Queue */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Import Queue ({files.length})</CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={() => setFiles([])}
                  variant="outline"
                  size="sm"
                  disabled={isImporting}
                >
                  Clear All
                </Button>
                <Button
                  onClick={startImport}
                  disabled={isImporting || files.filter(f => f.status === 'ready').length === 0}
                  size="sm"
                >
                  {isImporting ? 'Importing...' : 'Start Import'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {files.map((file, index) => (
                  <div key={file.id}>
                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className="flex items-center gap-2">
                        {getFileIcon(file.type)}
                        {getStatusIcon(file.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium truncate">{file.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {(file.size / 1024).toFixed(1)}KB
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(file.id)}
                              className="h-6 w-6 p-0"
                              disabled={isImporting}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        {(file.status === 'validating' || file.status === 'importing') && (
                          <Progress value={file.progress} className="h-2" />
                        )}
                        
                        {file.errors.length > 0 && (
                          <Alert className="mt-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              {file.errors.join(', ')}
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        {file.warnings.length > 0 && (
                          <div className="mt-2 text-sm text-amber-600">
                            ⚠️ {file.warnings.join(', ')}
                          </div>
                        )}
                        
                        {file.previewData && (
                          <div className="mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Preview Data
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    {index < files.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Import Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Import Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <FileSpreadsheet className="h-8 w-8 mb-2 text-primary" />
              <h3 className="font-medium mb-1">Medical Records CSV</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Template for importing lab results and test reports
              </p>
              <Button variant="outline" size="sm" className="w-full">
                <Download className="h-3 w-3 mr-1" />
                Download Template
              </Button>
            </div>
            
            <div className="p-4 border rounded-lg">
              <FileJson className="h-8 w-8 mb-2 text-primary" />
              <h3 className="font-medium mb-1">Health Data JSON</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Structured format for comprehensive health records
              </p>
              <Button variant="outline" size="sm" className="w-full">
                <Download className="h-3 w-3 mr-1" />
                Download Template
              </Button>
            </div>
            
            <div className="p-4 border rounded-lg">
              <FileText className="h-8 w-8 mb-2 text-primary" />
              <h3 className="font-medium mb-1">Prescription History</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Format for importing medication and prescription data
              </p>
              <Button variant="outline" size="sm" className="w-full">
                <Download className="h-3 w-3 mr-1" />
                Download Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportCenter;