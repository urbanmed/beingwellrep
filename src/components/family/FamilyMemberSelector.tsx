import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import type { FamilyMember } from "@/types/family-member";

interface FamilyMemberSelectorProps {
  familyMembers: FamilyMember[];
  selectedMemberId?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  allowSelf?: boolean;
  userDisplayName?: string;
}

export function FamilyMemberSelector({
  familyMembers,
  selectedMemberId,
  onValueChange,
  placeholder = "Select family member",
  allowSelf = true,
  userDisplayName = "Myself",
}: FamilyMemberSelectorProps) {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  return (
    <Select value={selectedMemberId} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowSelf && (
          <SelectItem value="self">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>{userDisplayName}</span>
            </div>
          </SelectItem>
        )}
        {familyMembers.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            <div className="flex items-center space-x-2">
              <Avatar className="h-4 w-4">
                <AvatarImage src={member.photo_url} />
                <AvatarFallback className="text-xs">
                  {getInitials(member.first_name, member.last_name)}
                </AvatarFallback>
              </Avatar>
              <span>{member.first_name} {member.last_name}</span>
              <span className="text-xs text-muted-foreground">
                ({member.relationship})
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}