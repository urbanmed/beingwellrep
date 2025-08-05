import { useState } from "react";
import { Camera, FileText, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploadArea } from "@/components/upload/FileUploadArea";
import { UploadProgress } from "@/components/upload/UploadProgress";
import { RecentUploads } from "@/components/upload/RecentUploads";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useToast } from "@/hooks/use-toast";

export default function Upload() {
  const { toast } = useToast();

  const { uploadFiles, isUploading, uploadProgress, uploadFileStates, resetUpload } = useFileUpload({
    onUploadComplete: (reportIds) => {
      console.log('Upload completed for reports:', reportIds);
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${reportIds.length} document(s). AI is analyzing them automatically.`,
      });
    },
    onUploadError: (error) => {
      console.error('Upload error:', error);
    }
  });

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;

    // Start immediate upload without requiring form input
    await uploadFiles(files);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Upload Medical Documents</h1>
        <p className="text-muted-foreground">
          Simply upload your documents - our AI will automatically extract titles, types, and details
        </p>
      </div>

      {/* File Upload Area */}
      <FileUploadArea
        onFileSelect={handleFileSelect}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
      />

      {/* Upload Progress */}
      <UploadProgress files={uploadFileStates} />

      {/* AI Features Information */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="text-center">
          <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
          <CardTitle className="text-lg">Smart Document Processing</CardTitle>
          <CardDescription>
            Our AI automatically extracts document titles, types, physician names, facility information, and more from your uploads. No manual entry required!
          </CardDescription>
        </CardHeader>
      </Card>

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