import { useState } from "react";
import { Upload, FileText, Sparkles, CheckCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FamilyMemberSelector } from "@/components/family/FamilyMemberSelector";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";
import { useToast } from "@/hooks/use-toast";
import { useReports } from "@/hooks/useReports";

interface QuickUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: () => void;
}

interface SelectedFile {
  file: File;
  id: string;
}

export function QuickUploadModal({ isOpen, onClose, onUploadComplete }: QuickUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string>("self");
  const [showFamilySelector, setShowFamilySelector] = useState(false);
  const { uploadFiles, isUploading, uploadProgress } = useFileUpload();
  const { familyMembers } = useFamilyMembers();
  const { toast } = useToast();
  const { refetch } = useReports();

  const acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  const maxFileSize = 50 * 1024 * 1024; // 50MB

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return 'Only PDF, JPEG, and PNG files are supported';
    }
    if (file.size > maxFileSize) {
      return 'File size must be less than 50MB';
    }
    return null;
  };

  const handleFiles = (files: File[]) => {
    const validFiles: SelectedFile[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push({
          file,
          id: Math.random().toString(36).substr(2, 9)
        });
      }
    });

    if (errors.length > 0) {
      toast({
        title: 'File validation failed',
        description: errors.join('\n'),
        variant: 'destructive',
      });
      return;
    }

    if (selectedFiles.length + validFiles.length > 5) {
      toast({
        title: 'Too many files',
        description: 'You can upload up to 5 files at once',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    // If user has family members, show selector
    if (familyMembers.length > 0 && !showFamilySelector) {
      setShowFamilySelector(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      const familyMemberId = selectedFamilyMemberId === "self" ? undefined : selectedFamilyMemberId;
      await uploadFiles(selectedFiles.map(f => f.file), undefined, undefined, { family_member_id: familyMemberId });
      
      // Refresh reports data
      await refetch();
      
      toast({
        title: 'Upload successful',
        description: `${selectedFiles.length} file(s) uploaded and processing started`,
      });
      
      setSelectedFiles([]);
      setShowFamilySelector(false);
      setSelectedFamilyMemberId("self");
      onUploadComplete?.();
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFiles([]);
      setShowFamilySelector(false);
      setSelectedFamilyMemberId("self");
      onClose();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-primary" />
            <span>Quick Upload</span>
          </DialogTitle>
          <DialogDescription>
            Upload medical documents for AI processing and categorization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* AI Processing Notice */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/50 dark:border-blue-800/30 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                AI Auto-Categorization
              </span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Our AI will automatically extract metadata, categorize your documents, and organize them in your vault.
            </p>
          </div>

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/40'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className={`h-8 w-8 mx-auto mb-2 ${
              isDragOver ? 'text-primary' : 'text-muted-foreground'
            }`} />
            <p className="text-sm font-medium mb-1">
              Drop files here or click to select
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              PDF, JPEG, PNG (max 50MB each)
            </p>
            
            <input
              type="file"
              id="quick-upload"
              className="hidden"
              multiple
              accept={acceptedTypes.join(',')}
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('quick-upload')?.click()}
              disabled={isUploading}
            >
              Choose Files
            </Button>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Selected Files ({selectedFiles.length})</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedFiles.map((selectedFile) => (
                  <div
                    key={selectedFile.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{selectedFile.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(selectedFile.file.size)}
                        </p>
                      </div>
                    </div>
                    {!isUploading && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(selectedFile.id)}
                        className="h-6 w-6 p-0 shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Family Member Selection */}
          {showFamilySelector && selectedFiles.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">Upload for Family Member</CardTitle>
                <CardDescription>
                  Select who these documents belong to
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FamilyMemberSelector
                  familyMembers={familyMembers}
                  selectedMemberId={selectedFamilyMemberId}
                  onValueChange={setSelectedFamilyMemberId}
                  placeholder="Select family member or yourself"
                  allowSelf={true}
                  userDisplayName="Myself"
                />
              </CardContent>
            </Card>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Uploading...</span>
                <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || isUploading}
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80"
            >
              {isUploading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Upload & Process
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}