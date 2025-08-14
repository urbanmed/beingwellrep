import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from 'react-pdf';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink, 
  FileText, 
  Image as ImageIcon,
  File,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl } from "@/lib/storage";
import { openInSystemBrowser } from "@/lib/utils/mobile";

// Set up PDF.js worker - use local worker file
pdfjs.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.js';

interface EnhancedDocumentViewerProps {
  report: {
    id: string;
    title: string;
    file_url: string | null;
    extracted_text: string | null;
  };
}

export function EnhancedDocumentViewer({ report }: EnhancedDocumentViewerProps) {
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [workingFileUrl, setWorkingFileUrl] = useState<string | null>(null);
  const [fileExists, setFileExists] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [viewMode, setViewMode] = useState<'inline' | 'external'>('inline');

  // Check if file exists and get proper URL
  useEffect(() => {
    const checkFileExistence = async () => {
      if (!report.file_url) {
        setFileExists(false);
        setIsChecking(false);
        return;
      }

      try {
        setIsChecking(true);
        setError(null);

        // Try to download the file to check if it exists
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) {
          setError('User not authenticated');
          setIsChecking(false);
          return;
        }

        // Use medical-documents bucket and the entire file_url as the file path
        const bucket = 'medical-documents';
        const filePath = report.file_url;

        console.log(`Checking file: bucket=${bucket}, path=${filePath}`);

        // Try direct download first to confirm existence
        const { error: downloadError } = await supabase.storage
          .from(bucket)
          .download(filePath);

        if (!downloadError) {
          console.log('File found at original path');
          setFileExists(true);
          const signed = await getSignedUrl({ bucket, path: filePath });
          setDocumentUrl(signed?.url || null);
        } else {
          console.log('File not found at original path, searching for alternatives:', downloadError);

          // If direct download fails, search for alternative files in the user's folder
          const { data: files, error: listError } = await supabase.storage
            .from(bucket)
            .list(authData.user.id, {
              limit: 100,
              search: ''
            });

          if (!listError && files && files.length > 0) {
            console.log(`Found ${files.length} files in user folder:`, files.map(f => f.name));
            
            // Sort files by last modified date (most recent first) and prioritize PDFs
            const sortedFiles = files
              .filter(file => {
                const name = file.name.toLowerCase();
                return name.includes('.pdf') || 
                       name.includes('.jpg') ||
                       name.includes('.jpeg') ||
                       name.includes('.png') ||
                       name.includes('.gif') ||
                       name.includes('.webp');
              })
              .sort((a, b) => {
                // Prioritize PDFs first, then by modification date
                const aIsPdf = a.name.toLowerCase().includes('.pdf');
                const bIsPdf = b.name.toLowerCase().includes('.pdf');
                
                if (aIsPdf && !bIsPdf) return -1;
                if (!aIsPdf && bIsPdf) return 1;
                
                // Both are same type, sort by date
                const aDate = new Date(a.updated_at || a.created_at || 0);
                const bDate = new Date(b.updated_at || b.created_at || 0);
                return bDate.getTime() - aDate.getTime();
              });

            if (sortedFiles.length > 0) {
              const alternativeFile = sortedFiles[0];
              const alternativePath = `${authData.user.id}/${alternativeFile.name}`;
              console.log(`Using alternative file: ${alternativePath}`);
              
              const signed = await getSignedUrl({ bucket, path: alternativePath });
              setDocumentUrl(signed?.url || null);
              setWorkingFileUrl(alternativePath);
              setFileExists(true);
            } else {
              console.log('No suitable alternative files found');
              setFileExists(false);
            }
          } else {
            console.log('Error listing files or no files found:', listError);
            setFileExists(false);
          }
        }
      } catch (error) {
        console.error('Error checking file existence:', error);
        setError('Failed to check file availability');
        setFileExists(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkFileExistence();
  }, [report.file_url]);

  const handleViewOriginal = async () => {
    if (documentUrl) {
      await openInSystemBrowser(documentUrl);
    }
  };

  const getFileInfo = () => {
    const fileUrl = workingFileUrl || report.file_url;
    if (!fileUrl) return { type: 'unknown', extension: '', icon: File };
    
    const extension = fileUrl.toLowerCase().split('.').pop() || '';
    
    if (extension === 'pdf') {
      return { type: 'PDF Document', extension: 'PDF', icon: FileText };
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return { type: 'Image', extension: extension.toUpperCase(), icon: ImageIcon };
    } else {
      return { type: 'Document', extension: extension.toUpperCase(), icon: File };
    }
  };

  const fileInfo = getFileInfo();
  const isPDF = fileInfo.extension === 'PDF';
  const isImage = ['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP'].includes(fileInfo.extension);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      return Math.max(1, Math.min(numPages || 1, newPageNumber));
    });
  };

  const changeScale = (scaleChange: number) => {
    setScale(prevScale => Math.max(0.5, Math.min(3.0, prevScale + scaleChange)));
  };

  const rotate = () => {
    setRotation(prevRotation => (prevRotation + 90) % 360);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <fileInfo.icon className="h-5 w-5" />
            Original Document
            <Badge variant="secondary">{fileInfo.extension}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'inline' ? 'external' : 'inline')}
            >
              {viewMode === 'inline' ? 'View Externally' : 'View Inline'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewOriginal}
              disabled={!documentUrl}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isChecking ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Checking file availability...</p>
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : !report.file_url ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No file has been uploaded for this report yet.
            </AlertDescription>
          </Alert>
        ) : !fileExists ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The original document file could not be found. It may have been moved or deleted.
            </AlertDescription>
          </Alert>
        ) : documentUrl && viewMode === 'inline' ? (
          <div className="space-y-4">
            {workingFileUrl && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Using alternative file from your account as the original file path was not accessible.
                </AlertDescription>
              </Alert>
            )}

            {isPDF ? (
              <div className="space-y-4">
                {/* PDF Controls */}
                <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changePage(-1)}
                      disabled={pageNumber <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {pageNumber} of {numPages || '?'}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changePage(1)}
                      disabled={pageNumber >= (numPages || 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changeScale(-0.2)}
                      disabled={scale <= 0.5}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm min-w-16 text-center">
                      {Math.round(scale * 100)}%
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changeScale(0.2)}
                      disabled={scale >= 3.0}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={rotate}
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* PDF Display */}
                <div className="border rounded-lg overflow-auto max-h-[600px] bg-gray-50">
                  <div className="flex justify-center p-4">
                    <Document
                      file={documentUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={(error) => setError(`Failed to load PDF: ${error.message}`)}
                      className="max-w-full"
                    >
                      <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        rotate={rotation}
                        className="shadow-lg"
                      />
                    </Document>
                  </div>
                </div>
              </div>
            ) : isImage ? (
              <div className="space-y-4">
                {/* Image Controls */}
                <div className="flex items-center justify-center bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changeScale(-0.2)}
                      disabled={scale <= 0.5}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm min-w-16 text-center">
                      {Math.round(scale * 100)}%
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changeScale(0.2)}
                      disabled={scale >= 3.0}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={rotate}
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Image Display */}
                <div className="border rounded-lg overflow-auto max-h-[600px] bg-gray-50">
                  <div className="flex justify-center p-4">
                    <img
                      src={documentUrl}
                      alt={`${report.title} - Original Document`}
                      style={{ 
                        transform: `scale(${scale}) rotate(${rotation}deg)`,
                        transformOrigin: 'center'
                      }}
                      className="max-w-full h-auto shadow-lg"
                      onError={() => setError('Failed to load image')}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This file type cannot be previewed inline. Click "Open in New Tab" to view the document.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          /* External view mode - show preview card */
          <div 
            className="border rounded-lg p-6 hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={handleViewOriginal}
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <fileInfo.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium truncate">{report.title}</h3>
                  <Badge variant="secondary" className="flex-shrink-0">
                    {fileInfo.extension}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {fileInfo.type}
                </p>
                {workingFileUrl && (
                  <p className="text-xs text-amber-600 mt-1">
                    Using alternative file from your account
                  </p>
                )}
              </div>
              
              <div className="flex-shrink-0">
                <ExternalLink className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}