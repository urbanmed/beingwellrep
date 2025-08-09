import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FamilyMemberCard } from "@/components/family/FamilyMemberCard";
import { AddFamilyMemberDialog } from "@/components/family/AddFamilyMemberDialog";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";
import type { FamilyMember, CreateFamilyMemberData } from "@/types/family-member";

export function FamilySection() {
  const {
    familyMembers,
    isLoading,
    createFamilyMember,
    updateFamilyMember,
    deleteFamilyMember,
    uploadFamilyMemberPhoto,
  } = useFamilyMembers();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

  const handleAddMember = async (data: CreateFamilyMemberData) => {
    return await createFamilyMember(data);
  };

  const handleEditMember = async (data: CreateFamilyMemberData) => {
    if (!editingMember) return null;
    
    const success = await updateFamilyMember({
      id: editingMember.id,
      ...data,
    });
    
    if (success) {
      setEditingMember(null);
      return { ...editingMember, ...data } as FamilyMember;
    }
    
    return null;
  };

  const handleDeleteMember = async () => {
    if (!deletingMemberId) return;
    
    const success = await deleteFamilyMember(deletingMemberId);
    if (success) {
      setDeletingMemberId(null);
    }
  };

  const openEditDialog = (member: FamilyMember) => {
    setEditingMember(member);
    setShowAddDialog(true);
  };

  const closeDialog = () => {
    setShowAddDialog(false);
    setEditingMember(null);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Family Members</h2>
          <p className="text-sm text-muted-foreground">
            Manage health records for your family members
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} size="sm" className="rounded-full h-9 px-3 text-sm shadow-none">
          <Plus className="mr-2 h-4 w-4" />
          Add Family Member
        </Button>
      </div>

      {familyMembers.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>No Family Members Added</CardTitle>
            <CardDescription>
              Start by adding your family members to manage their health records
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Family Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {familyMembers.map((member) => (
            <FamilyMemberCard
              key={member.id}
              member={member}
              onEdit={openEditDialog}
              onDelete={setDeletingMemberId}
              onPhotoUpload={uploadFamilyMemberPhoto}
            />
          ))}
        </div>
      )}

      <AddFamilyMemberDialog
        open={showAddDialog}
        onOpenChange={closeDialog}
        onSubmit={editingMember ? handleEditMember : handleAddMember}
        editingMember={editingMember}
      />

      <AlertDialog 
        open={!!deletingMemberId} 
        onOpenChange={() => setDeletingMemberId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Family Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this family member? This action cannot be undone.
              All associated medical records will remain but will no longer be linked to this family member.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}