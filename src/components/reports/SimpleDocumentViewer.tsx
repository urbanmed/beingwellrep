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

// Import the CSS to fix PDF rendering
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setError("Failed to load PDF document");
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
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center space-x-2">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{report.title}</span>
            </div>
            <div className="flex items-center space-x-2">
              {fileInfo.type === 'pdf' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScale(Math.max(0.5, scale - 0.25))}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScale(Math.min(3, scale + 0.25))}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRotation((rotation + 90) % 360)}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleViewOriginal}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Document content */}
          <div className="relative">
            {fileInfo.type === 'pdf' && documentUrl ? (
              <div className="space-y-4">
                {/* PDF pagination controls */}
                {numPages && numPages > 1 && (
                  <div className="flex items-center justify-center space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                      disabled={pageNumber <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {pageNumber} of {numPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                      disabled={pageNumber >= numPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* PDF viewer */}
                <div className="flex justify-center overflow-auto max-h-[800px] border rounded">
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
                    />
                  </Document>
                </div>
              </div>
            ) : fileInfo.type === 'image' && documentUrl ? (
              <div className="flex justify-center">
                <img
                  src={documentUrl}
                  alt={report.title}
                  className="max-w-full max-h-[800px] rounded border"
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