import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, Camera } from "lucide-react";
import type { FamilyMember } from "@/types/family-member";
import { formatDate } from "@/lib/utils";
import { getSignedUrl } from "@/lib/storage";

interface FamilyMemberCardProps {
  member: FamilyMember;
  onEdit: (member: FamilyMember) => void;
  onDelete: (id: string) => void;
  onPhotoUpload: (memberId: string, file: File) => void;
}

export function FamilyMemberCard({ member, onEdit, onDelete, onPhotoUpload }: FamilyMemberCardProps) {
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadSigned() {
      if (member.photo_url) {
        const signed = await getSignedUrl({ bucket: 'profile-images', path: member.photo_url });
        if (isMounted) setSignedPhotoUrl(signed?.url || null);
      } else {
        if (isMounted) setSignedPhotoUrl(null);
      }
    }
    loadSigned();
    return () => { isMounted = false; };
  }, [member.photo_url]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsPhotoLoading(true);
    await onPhotoUpload(member.id, file);
    setIsPhotoLoading(false);
  };

  const getInitials = () => {
    return `${member.first_name[0]}${member.last_name[0]}`.toUpperCase();
  };

  const getRelationshipColor = (relationship: string) => {
    const colors = {
      spouse: "bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300",
      child: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
      parent: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
      sibling: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300",
      grandparent: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300",
      grandchild: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300",
      other: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300",
    };
    return colors[relationship as keyof typeof colors] || colors.other;
  };

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={signedPhotoUrl || undefined} alt={`${member.first_name} ${member.last_name}`} />
                <AvatarFallback>{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1">
                <label htmlFor={`photo-${member.id}`} className="cursor-pointer">
                  <div className="rounded-full bg-primary p-1 text-primary-foreground hover:bg-primary/90">
                    <Camera className="h-3 w-3" />
                  </div>
                </label>
                <input
                  id={`photo-${member.id}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={isPhotoLoading}
                />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">
                {member.first_name} {member.last_name}
              </h3>
              <Badge variant="secondary" className={getRelationshipColor(member.relationship)}>
                {member.relationship}
              </Badge>
              {member.date_of_birth && (
                <p className="text-sm text-muted-foreground mt-1">
                  Born: {formatDate(member.date_of_birth)}
                </p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(member)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(member.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {member.medical_notes && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>Medical Notes:</strong> {member.medical_notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}