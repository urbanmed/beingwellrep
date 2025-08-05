export interface FamilyMember {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  relationship: string;
  date_of_birth?: string;
  gender?: string;
  phone_number?: string;
  photo_url?: string;
  medical_notes?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFamilyMemberData {
  first_name: string;
  last_name: string;
  relationship: string;
  date_of_birth?: Date;
  gender?: string;
  phone_number?: string;
  medical_notes?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export interface UpdateFamilyMemberData extends Partial<CreateFamilyMemberData> {
  id: string;
}

export const RELATIONSHIP_OPTIONS = [
  { value: "spouse", label: "Spouse" },
  { value: "child", label: "Child" },
  { value: "parent", label: "Parent" },
  { value: "sibling", label: "Sibling" },
  { value: "grandparent", label: "Grandparent" },
  { value: "grandchild", label: "Grandchild" },
  { value: "other", label: "Other" },
] as const;

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;