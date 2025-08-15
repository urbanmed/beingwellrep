import { useState } from "react";
import { Camera, FileText, Sparkles, Upload as UploadIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUploadArea } from "@/components/upload/FileUploadArea";
import { UploadProgress } from "@/components/upload/UploadProgress";
import { RecentUploads } from "@/components/upload/RecentUploads";
import { FamilyMemberSelector } from "@/components/family/FamilyMemberSelector";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";
import { useToast } from "@/hooks/use-toast";

export default function Upload() {
  const { toast } = useToast();
  const { familyMembers } = useFamilyMembers();
  
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string>("self");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showFamilySelector, setShowFamilySelector] = useState(false);

  const { uploadFiles, isUploading, uploadProgress, uploadFileStates, resetUpload } = useFileUpload({
    onUploadComplete: (reportIds) => {
      console.log('Upload completed for reports:', reportIds);
      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${reportIds.length} document(s). AI is analyzing them automatically.`,
      });
      setShowFamilySelector(false);
      setPendingFiles([]);
      setSelectedFamilyMemberId("self");
    },
    onUploadError: (error) => {
      console.error('Upload error:', error);
      setShowFamilySelector(false);
      setPendingFiles([]);
    }
  });

  const handleFileSelect = async (files: File[]) => {
    if (files.length === 0) return;

    // If user has family members, show selector. Otherwise upload directly.
    if (familyMembers.length > 0) {
      setPendingFiles(files);
      setShowFamilySelector(true);
    } else {
      await uploadFiles(files);
    }
  };

  const handleUploadWithMember = async () => {
    if (pendingFiles.length === 0) return;

    const familyMemberId = selectedFamilyMemberId === "self" ? undefined : selectedFamilyMemberId;
    await uploadFiles(pendingFiles, undefined, undefined, { family_member_id: familyMemberId });
  };

  return (
    <main className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 pb-16 sm:pb-20 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <UploadIcon className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold">Upload Documents</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Upload medical documents for AI processing and categorization
        </p>
      </div>

      {/* AI Processing Notice */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/50 dark:border-blue-800/30 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
            AI Auto-Categorization
          </span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Our AI automatically extracts document titles, types, physician names, facility information, and more from your uploads. No manual entry required!
        </p>
      </div>

      {/* File Upload Area */}
      <FileUploadArea
        onFileSelect={handleFileSelect}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
      />

      {/* Family Member Selection */}
      {showFamilySelector && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Upload for Family Member</CardTitle>
            <CardDescription>
              Select who these documents belong to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FamilyMemberSelector
              familyMembers={familyMembers}
              selectedMemberId={selectedFamilyMemberId}
              onValueChange={setSelectedFamilyMemberId}
              placeholder="Select family member or yourself"
              allowSelf={true}
              userDisplayName="Myself"
            />
            <div className="flex space-x-2">
              <Button 
                onClick={handleUploadWithMember}
                disabled={isUploading}
                className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 min-h-[44px] touch-target"
              >
                {isUploading ? "Uploading..." : "Upload Documents"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowFamilySelector(false);
                  setPendingFiles([]);
                }}
                disabled={isUploading}
                className="min-h-[44px] touch-target"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors border-dashed min-h-[44px] touch-target active:scale-[0.98] transition-transform">
          <CardHeader className="text-center py-4">
            <FileText className="h-6 w-6 text-primary mx-auto mb-2" />
            <CardTitle className="text-sm font-medium">Drag & Drop Files</CardTitle>
            <CardDescription className="text-xs">
              Drag files directly to the upload area above
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors border-dashed min-h-[44px] touch-target active:scale-[0.98] transition-transform">
          <CardHeader className="text-center py-4">
            <Camera className="h-6 w-6 text-primary mx-auto mb-2" />
            <CardTitle className="text-sm font-medium">Mobile Camera</CardTitle>
            <CardDescription className="text-xs">
              Use your phone's camera to capture documents
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Uploads */}
      <RecentUploads />
    </main>
  );
}