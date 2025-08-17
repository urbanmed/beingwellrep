import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, 
  ExternalLink, 
  FileText, 
  Image as ImageIcon, 
  Loader2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Document, Page, pdfjs } from 'react-pdf';
import { generateDocumentUrl, checkDocumentExists } from "@/lib/utils/simple-document-access";
import { useFileDownload } from "@/hooks/useFileDownload";

// Configure PDF.js worker with multiple fallback strategies
if (typeof window !== 'undefined') {
  try {
    // Primary: Use versioned CDN (more reliable than unpkg)
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    console.log(`PDF.js worker configured with CDN version ${pdfjs.version}`);
  } catch (error) {
    console.warn('CDN worker setup failed, using alternative:', error);
    // Fallback: Use unpkg with explicit version
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
  }
}

interface SimpleDocumentViewerProps {
  report: {
    id: string;
    title: string;
    file_url: string | null;
    file_name?: string | null;
  };
}

export function SimpleDocumentViewer({ report }: SimpleDocumentViewerProps) {
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileExists, setFileExists] = useState(false);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { downloadFile } = useFileDownload();

  const getFileInfo = (fileName: string | null) => {
    if (!fileName) return { type: 'unknown', icon: FileText };
    
    const extension = fileName.toLowerCase().split('.').pop();
    
    switch (extension) {
      case 'pdf':
        return { type: 'pdf', icon: FileText };
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return { type: 'image', icon: ImageIcon };
      default:
        return { type: 'unknown', icon: FileText };
    }
  };

  const loadDocument = async () => {
    if (!report.file_url) {
      setError("No file URL available");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check if file exists
      const exists = await checkDocumentExists(report.file_url);
      setFileExists(exists);

      if (!exists) {
        setError("Document file not found");
        setIsLoading(false);
        return;
      }

      // Generate signed URL
      const result = await generateDocumentUrl(report.file_url);
      
      if (!result.success) {
        setError(result.error || "Failed to load document");
        setIsLoading(false);
        return;
      }

      setDocumentUrl(result.url || null);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading document:', error);
      setError("Unexpected error loading document");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocument();
  }, [report.file_url]);

  const handleDownload = async () => {
    if (report.file_url && report.file_name) {
      await downloadFile(report.id, report.file_name, report.file_url);
    }
  };

  const handleViewOriginal = () => {
    if (documentUrl) {
      window.open(documentUrl, '_blank');
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setPdfError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setPdfError(`Failed to load PDF: ${error.message}`);
    // Don't set general error, keep PDF-specific error separate
  };

  // Fallback to native browser PDF viewer
  const openInNativePDFViewer = () => {
    if (documentUrl) {
      // Create iframe for native PDF viewing
      const iframe = document.createElement('iframe');
      iframe.src = documentUrl;
      iframe.style.width = '100%';
      iframe.style.height = '600px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '8px';
      
      // Replace PDF viewer with native iframe
      const container = document.getElementById('pdf-viewer-container');
      if (container) {
        container.innerHTML = '';
        container.appendChild(iframe);
      }
    }
  };

  const fileInfo = getFileInfo(report.file_name);
  const Icon = fileInfo.icon;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading document...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !fileExists) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mr-2" />
            <div className="text-center">
              <p className="font-medium">{error || "Document not found"}</p>
              <p className="text-sm mt-1">The document file may have been moved or deleted.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={loadDocument}
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header with controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-3">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <span className="font-medium truncate">{report.title}</span>
            </div>
            <div className="flex items-center justify-end space-x-1 sm:space-x-2 flex-shrink-0">
              {fileInfo.type === 'pdf' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScale(Math.max(0.5, scale - 0.25))}
                    className="px-2 sm:px-3"
                  >
                    <ZoomOut className="h-4 w-4" />
                    <span className="sr-only">Zoom out</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScale(Math.min(3, scale + 0.25))}
                    className="px-2 sm:px-3"
                  >
                    <ZoomIn className="h-4 w-4" />
                    <span className="sr-only">Zoom in</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRotation((rotation + 90) % 360)}
                    className="px-2 sm:px-3"
                  >
                    <RotateCw className="h-4 w-4" />
                    <span className="sr-only">Rotate</span>
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={handleDownload} className="px-2 sm:px-3">
                <Download className="h-4 w-4" />
                <span className="sr-only">Download</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleViewOriginal} className="px-2 sm:px-3">
                <ExternalLink className="h-4 w-4" />
                <span className="sr-only">Open in new tab</span>
              </Button>
            </div>
          </div>

          {/* Document content */}
          <div className="relative">
            {fileInfo.type === 'pdf' && documentUrl ? (
              <div className="space-y-4">
                {pdfError ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mr-2" />
                    <div className="text-center">
                      <p className="font-medium">PDF Loading Error</p>
                      <p className="text-sm mt-1">{pdfError}</p>
                      <div className="flex gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setPdfError(null);
                            loadDocument();
                          }}
                        >
                          Retry PDF Viewer
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={openInNativePDFViewer}
                        >
                          Use Browser PDF Viewer
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* PDF pagination controls */}
                    {numPages && numPages > 1 && (
                      <div className="flex items-center justify-center space-x-2 sm:space-x-4 px-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                          disabled={pageNumber <= 1}
                          className="px-2 sm:px-3"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="sr-only">Previous page</span>
                        </Button>
                        <span className="text-sm font-medium px-2">
                          {pageNumber} / {numPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                          disabled={pageNumber >= numPages}
                          className="px-2 sm:px-3"
                        >
                          <ChevronRight className="h-4 w-4" />
                          <span className="sr-only">Next page</span>
                        </Button>
                      </div>
                    )}

                     {/* PDF viewer with error boundary */}
                    <div id="pdf-viewer-container" className="flex justify-center overflow-auto max-h-[60vh] sm:max-h-[800px] border rounded touch-pan-x touch-pan-y">
                      <Document
                        file={documentUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        loading={
                          <div className="flex items-center justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span className="ml-2">Loading PDF...</span>
                          </div>
                        }
                        error={
                          <div className="flex items-center justify-center p-8 text-muted-foreground">
                            <AlertCircle className="h-6 w-6 mr-2" />
                            <div className="text-center">
                              <span>Failed to load PDF</span>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="mt-2 block mx-auto"
                                onClick={openInNativePDFViewer}
                              >
                                Open in Browser PDF Viewer
                              </Button>
                            </div>
                          </div>
                        }
                        options={{
                          cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/cmaps/`,
                          cMapPacked: true,
                          standardFontDataUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/standard_fonts/`,
                        }}
                      >
                        <Page
                          pageNumber={pageNumber}
                          scale={scale}
                          rotate={rotation}
                          loading={
                            <div className="flex items-center justify-center p-8">
                              <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                          }
                          error={
                            <div className="flex items-center justify-center p-8 text-muted-foreground">
                              <AlertCircle className="h-6 w-6 mr-2" />
                              <span>Error loading page</span>
                            </div>
                          }
                        />
                      </Document>
                    </div>
                  </>
                )}
              </div>
            ) : fileInfo.type === 'image' && documentUrl ? (
              <div className="flex justify-center overflow-auto max-h-[60vh] sm:max-h-[800px] touch-pan-x touch-pan-y">
                <img
                  src={documentUrl}
                  alt={report.title}
                  className="max-w-full h-auto rounded border"
                  style={{ transform: `scale(${scale}) rotate(${rotation}deg)` }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mb-2" />
                <div className="text-center">
                  <p>Document preview not available</p>
                  <p className="text-sm">Click "Download" or "Open" to view the file</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}