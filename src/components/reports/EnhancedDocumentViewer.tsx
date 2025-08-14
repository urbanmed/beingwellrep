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
import { validateMedicalDocument, getDocumentErrorMessage, logDocumentAccess, type DocumentError } from "@/lib/utils/document-security";
import { openInSystemBrowser } from "@/lib/utils/mobile";

// Let react-pdf handle worker setup internally

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
  
  const [fileExists, setFileExists] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<DocumentError | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [viewMode, setViewMode] = useState<'inline' | 'external'>('inline');
  const [isRefreshingUrl, setIsRefreshingUrl] = useState(false);
  const [urlExpiredAt, setUrlExpiredAt] = useState<Date | null>(null);

  // Generate or refresh signed URL
  const generateSignedUrl = async (retryCount = 0): Promise<string | null> => {
    if (!report.file_url) return null;

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        throw new Error('User not authenticated');
      }

      const bucket = 'medical-documents';
      const filePath = report.file_url;

      console.log(`Generating signed URL: bucket=${bucket}, path=${filePath}`);

      const signed = await getSignedUrl({ 
        bucket, 
        path: filePath, 
        expiresIn: 3600 // 1 hour expiration
      });

      if (signed?.url) {
        setUrlExpiredAt(new Date(Date.now() + 3600000)); // 1 hour from now
        return signed.url;
      }
      
      return null;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      if (retryCount < 2) {
        console.log(`Retrying URL generation, attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return generateSignedUrl(retryCount + 1);
      }
      throw error;
    }
  };

  // Check if URL has expired
  const isUrlExpired = () => {
    if (!urlExpiredAt) return false;
    return new Date() >= urlExpiredAt;
  };

  // Refresh URL if expired
  const refreshUrlIfNeeded = async () => {
    if (!documentUrl || !isUrlExpired()) return documentUrl;

    try {
      setIsRefreshingUrl(true);
      const newUrl = await generateSignedUrl();
      if (newUrl) {
        setDocumentUrl(newUrl);
        return newUrl;
      }
      return documentUrl;
    } catch (error) {
      console.error('Failed to refresh URL:', error);
      setError({
        type: 'ACCESS_DENIED',
        message: 'Failed to refresh document access. Please reload the page.'
      });
      return null;
    } finally {
      setIsRefreshingUrl(false);
    }
  };

  // Check if file exists and get proper URL with enhanced security
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

        logDocumentAccess(report.file_url, 'VALIDATE', 'SUCCESS');

        // Use secure validation - no alternative file fallbacks
        const validation = await validateMedicalDocument(report.file_url);
        
        if (!validation.isValid || !validation.fileExists) {
          setFileExists(false);
          setError(validation.error || {
            type: 'NOT_FOUND',
            message: 'Document validation failed'
          });
          logDocumentAccess(report.file_url, 'VALIDATE', 'FAILURE', validation.error?.message);
          setIsChecking(false);
          return;
        }

        console.log('[SECURITY] File validated, generating signed URL...');
        setFileExists(true);
        const url = await generateSignedUrl();
        setDocumentUrl(url);
        logDocumentAccess(report.file_url, 'VIEW', 'SUCCESS');

      } catch (error) {
        console.error('[SECURITY] Document access error:', error);
        setFileExists(false);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setError({
          type: 'UNKNOWN',
          message: errorMessage
        });
        logDocumentAccess(report.file_url, 'VALIDATE', 'FAILURE', errorMessage);
      } finally {
        setIsChecking(false);
      }
    };

    checkFileExistence();
  }, [report.file_url]);

  const handleViewOriginal = async () => {
    const url = await refreshUrlIfNeeded();
    if (url) {
      await openInSystemBrowser(url);
    }
  };

  const getFileInfo = () => {
    const fileUrl = report.file_url;
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
        {isChecking || isRefreshingUrl ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">
                {isRefreshingUrl ? 'Refreshing document access...' : 'Checking file availability...'}
              </p>
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {getDocumentErrorMessage(error)}
            </AlertDescription>
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
              Document file not available. This medical document could not be accessed from secure storage.
            </AlertDescription>
          </Alert>
        ) : documentUrl && viewMode === 'inline' ? (
          <div className="space-y-4">

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
                      onLoadError={(error) => setError({
                        type: 'INVALID_TYPE',
                        message: `Failed to load PDF: ${error.message}`
                      })}
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
                      src={documentUrl || undefined}
                      alt={`${report.title} - Original Document`}
                      style={{ 
                        transform: `scale(${scale}) rotate(${rotation}deg)`,
                        transformOrigin: 'center'
                      }}
                      className="max-w-full h-auto shadow-lg"
                      onError={async () => {
                        console.log('Image failed to load, attempting to refresh URL');
                        const newUrl = await refreshUrlIfNeeded();
                        if (!newUrl) {
                          setError({
                            type: 'NETWORK_ERROR',
                            message: 'Failed to load image. Please refresh the page.'
                          });
                        }
                      }}
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