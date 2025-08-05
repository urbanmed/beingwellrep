import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { FamilyMember, CreateFamilyMemberData, UpdateFamilyMemberData } from "@/types/family-member";

export function useFamilyMembers() {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchFamilyMembers = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("family_members")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setFamilyMembers(data || []);
    } catch (error) {
      console.error("Error fetching family members:", error);
      toast({
        title: "Error",
        description: "Failed to load family members",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createFamilyMember = async (data: CreateFamilyMemberData): Promise<FamilyMember | null> => {
    if (!user) return null;

    try {
      const insertData = {
        user_id: user.id,
        ...data,
        date_of_birth: data.date_of_birth ? data.date_of_birth.toISOString().split('T')[0] : undefined,
      };

      const { data: newMember, error } = await supabase
        .from("family_members")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      setFamilyMembers(prev => [...prev, newMember]);
      toast({
        title: "Success",
        description: "Family member added successfully",
      });

      return newMember;
    } catch (error) {
      console.error("Error creating family member:", error);
      toast({
        title: "Error",
        description: "Failed to add family member",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateFamilyMember = async (data: UpdateFamilyMemberData): Promise<boolean> => {
    try {
      const { id, ...updateData } = data;
      const processedUpdateData = {
        ...updateData,
        date_of_birth: updateData.date_of_birth 
          ? updateData.date_of_birth.toISOString().split('T')[0] 
          : undefined,
      };

      const { error } = await supabase
        .from("family_members")
        .update(processedUpdateData)
        .eq("id", id);

      if (error) throw error;

      setFamilyMembers(prev =>
        prev.map(member => (member.id === id ? { ...member, ...processedUpdateData } : member))
      );

      toast({
        title: "Success",
        description: "Family member updated successfully",
      });

      return true;
    } catch (error) {
      console.error("Error updating family member:", error);
      toast({
        title: "Error",
        description: "Failed to update family member",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteFamilyMember = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("family_members")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setFamilyMembers(prev => prev.filter(member => member.id !== id));
      toast({
        title: "Success",
        description: "Family member removed successfully",
      });

      return true;
    } catch (error) {
      console.error("Error deleting family member:", error);
      toast({
        title: "Error",
        description: "Failed to remove family member",
        variant: "destructive",
      });
      return false;
    }
  };

  const uploadFamilyMemberPhoto = async (memberId: string, file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${memberId}-${Date.now()}.${fileExt}`;
      const filePath = `family-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      // Update the family member's photo_url
      const { error: updateError } = await supabase
        .from("family_members")
        .update({ photo_url: publicUrl })
        .eq("id", memberId);

      if (updateError) throw updateError;

      setFamilyMembers(prev =>
        prev.map(member => 
          member.id === memberId ? { ...member, photo_url: publicUrl } : member
        )
      );

      return publicUrl;
    } catch (error) {
      console.error("Error uploading family member photo:", error);
      toast({
        title: "Error",
        description: "Failed to upload photo",
        variant: "destructive",
      });
      return null;
    }
  };

  useEffect(() => {
    fetchFamilyMembers();
  }, [user]);

  return {
    familyMembers,
    isLoading,
    fetchFamilyMembers,
    createFamilyMember,
    updateFamilyMember,
    deleteFamilyMember,
    uploadFamilyMemberPhoto,
  };
}