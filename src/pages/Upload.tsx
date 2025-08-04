import { useState } from "react";
import { Camera, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUploadArea } from "@/components/upload/FileUploadArea";
import { ReportTypeSelector } from "@/components/upload/ReportTypeSelector";
import { UploadProgress } from "@/components/upload/UploadProgress";
import { RecentUploads } from "@/components/upload/RecentUploads";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useToast } from "@/hooks/use-toast";

export default function Upload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [reportType, setReportType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [physicianName, setPhysicianName] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const { toast } = useToast();

  const { uploadFiles, isUploading, uploadProgress, uploadFileStates, resetUpload } = useFileUpload({
    onUploadComplete: (reportIds) => {
      console.log('Upload completed for reports:', reportIds);
      // Reset form
      setSelectedFiles([]);
      setTitle("");
      setDescription("");
      setPhysicianName("");
      setFacilityName("");
      setReportType("");
      setShowUploadForm(false);
      // Trigger refresh of recent uploads (RecentUploads component will handle this)
    },
    onUploadError: (error) => {
      console.error('Upload error:', error);
    }
  });

  const handleFileSelect = (files: File[]) => {
    setSelectedFiles(files);
    if (files.length > 0 && !showUploadForm) {
      setShowUploadForm(true);
    }
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload.",
        variant: "destructive",
      });
      return;
    }

    if (!reportType) {
      toast({
        title: "Report type required",
        description: "Please select a report type.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your report.",
        variant: "destructive",
      });
      return;
    }

    const additionalData = {
      description: description.trim() || null,
      physician_name: physicianName.trim() || null,
      facility_name: facilityName.trim() || null,
    };

    await uploadFiles(selectedFiles, reportType, title.trim(), additionalData);
  };

  const handleCancel = () => {
    setSelectedFiles([]);
    setShowUploadForm(false);
    resetUpload();
  };

  return (
    <div className="p-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Upload Medical Documents</h1>
        <p className="text-muted-foreground">
          Upload your medical reports and documents for AI analysis and OCR processing
        </p>
      </div>

      {/* File Upload Area */}
      <FileUploadArea
        onFileSelect={handleFileSelect}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
      />

      {/* Upload Form */}
      {showUploadForm && selectedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Document Details</CardTitle>
            <CardDescription>
              Provide details about your medical documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Document Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Blood Test Results - January 2024"
                  disabled={isUploading}
                />
              </div>

              <ReportTypeSelector
                value={reportType}
                onChange={setReportType}
                disabled={isUploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional notes or context about this document..."
                disabled={isUploading}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="physician">Physician Name (Optional)</Label>
                <Input
                  id="physician"
                  value={physicianName}
                  onChange={(e) => setPhysicianName(e.target.value)}
                  placeholder="Dr. Jane Smith"
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="facility">Medical Facility (Optional)</Label>
                <Input
                  id="facility"
                  value={facilityName}
                  onChange={(e) => setFacilityName(e.target.value)}
                  placeholder="City General Hospital"
                  disabled={isUploading}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleSubmit} 
                disabled={isUploading || !reportType || !title.trim()}
                className="flex-1"
              >
                {isUploading ? 'Uploading...' : 'Upload Documents'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancel}
                disabled={isUploading}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      <UploadProgress files={uploadFileStates} />

      {/* Upload Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
          <CardHeader className="text-center">
            <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
            <CardTitle className="text-lg">Drag & Drop Files</CardTitle>
            <CardDescription>
              Drag files directly to the upload area above
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
          <CardHeader className="text-center">
            <Camera className="h-8 w-8 text-primary mx-auto mb-2" />
            <CardTitle className="text-lg">Mobile Camera</CardTitle>
            <CardDescription>
              Use your phone's camera to capture documents
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Uploads */}
      <RecentUploads />
    </div>
  );
}