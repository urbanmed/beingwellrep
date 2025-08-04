import { useState } from "react";
import { Upload as UploadIcon, FileText, Camera, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Upload() {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    // Handle file upload logic here
  };

  return (
    <div className="p-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Upload Documents</h1>
        <p className="text-muted-foreground">
          Upload your medical reports and documents for AI analysis
        </p>
      </div>

      {/* Upload Area */}
      <Card 
        className={`relative border-2 border-dashed transition-colors ${
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <UploadIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Drop files here</h3>
          <p className="text-muted-foreground mb-4">
            Or click to select files from your device
          </p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Choose Files
          </Button>
        </CardContent>
      </Card>

      {/* Upload Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
          <CardHeader className="text-center">
            <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
            <CardTitle className="text-lg">Documents</CardTitle>
            <CardDescription>
              Upload PDFs, images, and other medical documents
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
          <CardHeader className="text-center">
            <Camera className="h-8 w-8 text-primary mx-auto mb-2" />
            <CardTitle className="text-lg">Take Photo</CardTitle>
            <CardDescription>
              Capture documents using your device camera
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Uploads */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Uploads</h2>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-center py-8">
              No uploads yet. Start by uploading your first document above.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}