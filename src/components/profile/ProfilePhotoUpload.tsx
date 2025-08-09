
import { useState, useRef, useEffect } from "react";
import { Camera, Upload, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getSignedUrl, parseStorageUrl } from "@/lib/storage";

interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string | null;
  onPhotoChange?: (url: string | null) => void;
  className?: string;
}

export function ProfilePhotoUpload({ 
  currentPhotoUrl, 
  onPhotoChange,
  className = "" 
}: ProfilePhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    uploadPhoto(file);
  };

  const uploadPhoto = async (file: File) => {
    if (!user) return;

    setIsUploading(true);
    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      // Delete old photo if we know its storagePath
      try {
        if (storagePath) {
          console.log("[ProfilePhotoUpload] Removing old photo at", storagePath);
          await supabase.storage.from('profile-images').remove([storagePath]);
        } else if (previewUrl) {
          // Fallback: parse from preview URL if available
          const parsed = parseStorageUrl(previewUrl);
          if (parsed?.bucket === 'profile-images' && parsed.path) {
            console.log("[ProfilePhotoUpload] Removing old photo via parsed URL path", parsed.path);
            await supabase.storage.from('profile-images').remove([parsed.path]);
          }
        }
      } catch (rmErr) {
        console.warn("[ProfilePhotoUpload] Removing old photo failed (continuing):", rmErr);
      }

      // Upload new photo
      const newStoragePath = `${user.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(newStoragePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Update profile in database with storage path (not a public URL)
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          avatar_url: newStoragePath,
        });

      if (updateError) throw updateError;

      // Generate a signed URL for preview
      const signed = await getSignedUrl({ bucket: 'profile-images', path: newStoragePath });
      const signedUrl = signed?.url || null;

      // Update local state
      setStoragePath(newStoragePath);
      setPreviewUrl(signedUrl);
      onPhotoChange?.(newStoragePath);

      toast({
        title: "Photo uploaded successfully",
        description: "Your profile photo has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    if (!user) return;

    setIsUploading(true);
    try {
      // Prefer removing using known storagePath; fallback to parsing previewUrl
      let pathToRemove: string | null = storagePath || null;
      if (!pathToRemove && previewUrl) {
        const parsed = parseStorageUrl(previewUrl);
        if (parsed?.bucket === 'profile-images' && parsed.path) {
          pathToRemove = parsed.path;
        }
      }

      if (pathToRemove) {
        console.log("[ProfilePhotoUpload] Removing photo at", pathToRemove);
        await supabase.storage.from('profile-images').remove([pathToRemove]);
      }

      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          avatar_url: null,
        });

      if (error) throw error;

      // Update local state
      setPreviewUrl(null);
      setStoragePath(null);
      onPhotoChange?.(null);

      toast({
        title: "Photo removed",
        description: "Your profile photo has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to remove photo",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Make sure we can render existing stored values (path or legacy URL)
  useEffect(() => {
    let isMounted = true;
    async function syncPreview() {
      if (!currentPhotoUrl) {
        if (isMounted) {
          setPreviewUrl(null);
          setStoragePath(null);
        }
        return;
      }

      // Detect if it's a URL or a storage path
      let isUrl = false;
      try {
        // new URL throws if not absolute URL
        // @ts-ignore
        new URL(currentPhotoUrl);
        isUrl = true;
      } catch {
        isUrl = false;
      }

      if (isUrl) {
        // Parse storage info from the URL and sign again for freshness
        const parsed = parseStorageUrl(currentPhotoUrl);
        if (parsed?.bucket && parsed.path) {
          const signed = await getSignedUrl({ bucket: parsed.bucket, path: parsed.path });
          if (isMounted) {
            setStoragePath(parsed.path);
            setPreviewUrl(signed?.url || currentPhotoUrl);
          }
          return;
        }
        // If parsing fails, just use it as-is
        if (isMounted) {
          setStoragePath(null);
          setPreviewUrl(currentPhotoUrl);
        }
      } else {
        // Treat it as a storage path
        const signed = await getSignedUrl({ bucket: 'profile-images', path: currentPhotoUrl });
        if (isMounted) {
          setStoragePath(currentPhotoUrl);
          setPreviewUrl(signed?.url || null);
        }
      }
    }
    syncPreview();
    return () => { isMounted = false; };
  }, [currentPhotoUrl]);

  const getInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Avatar className="h-24 w-24">
              {previewUrl ? (
                <AvatarImage src={previewUrl} alt="Profile photo" />
              ) : (
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {user?.email ? getInitials(user.email) : <User className="h-12 w-12" />}
                </AvatarFallback>
              )}
            </Avatar>
            
            {previewUrl && (
              <Button
                size="sm"
                type="button"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                onClick={handleRemovePhoto}
                disabled={isUploading}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={triggerFileInput}
              disabled={isUploading}
              className="flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Uploading...
                </>
              ) : (
                <>
                  {previewUrl ? <Camera className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                  {previewUrl ? 'Change Photo' : 'Upload Photo'}
                </>
              )}
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <p className="text-xs text-muted-foreground text-center">
            Upload a photo up to 5MB. Supported formats: PNG, JPG, GIF
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
