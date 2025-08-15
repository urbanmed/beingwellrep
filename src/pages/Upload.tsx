import { useState } from "react";
import { Camera, FileText, Sparkles } from "lucide-react";
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
      <div className="text-center space-y-2">
        <h1 className="medical-title">Upload Medical Documents</h1>
        <p className="medical-label">
          Simply upload your documents - our AI will automatically extract titles, types, and details
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
        <Card className="border-primary/20 bg-primary/5 medical-card-shadow">
          <CardHeader>
            <CardTitle className="medical-heading">Upload for Family Member</CardTitle>
            <CardDescription>
              Select who this document belongs to
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
                className="flex-1 rounded-full shadow-none min-h-[44px] touch-target"
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
                className="rounded-full shadow-none min-h-[44px] touch-target"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      <UploadProgress files={uploadFileStates} />

      {/* AI Features Information */}
      <Card className="border-primary/20 bg-primary/5 medical-card-shadow">
        <CardHeader className="text-center">
          <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
          <CardTitle className="medical-heading">Smart Document Processing</CardTitle>
          <CardDescription>
            Our AI automatically extracts document titles, types, physician names, facility information, and more from your uploads. No manual entry required!
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Upload Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors medical-card-shadow min-h-[44px] touch-target active:scale-[0.98] transition-transform">
          <CardHeader className="text-center">
            <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
            <CardTitle className="medical-heading">Drag & Drop Files</CardTitle>
            <CardDescription>
              Drag files directly to the upload area above
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors medical-card-shadow min-h-[44px] touch-target active:scale-[0.98] transition-transform">
          <CardHeader className="text-center">
            <Camera className="h-8 w-8 text-primary mx-auto mb-2" />
            <CardTitle className="medical-heading">Mobile Camera</CardTitle>
            <CardDescription>
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