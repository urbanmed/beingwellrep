import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useFamilyMembers } from '@/hooks/useFamilyMembers';
import type { FamilyMember } from '@/types/family-member';

interface FamilyMemberContextType {
  selectedMemberId: string | null; // null means "self"
  selectedMember: FamilyMember | null; // null means "self"
  setSelectedMemberId: (id: string | null) => void;
  familyMembers: FamilyMember[];
  isLoading: boolean;
}

const FamilyMemberContext = createContext<FamilyMemberContextType | undefined>(undefined);

export function FamilyMemberProvider({ children }: { children: ReactNode }) {
  const [selectedMemberId, setSelectedMemberIdState] = useState<string | null>(() => {
    // Load from localStorage on initialization
    return localStorage.getItem('selectedFamilyMemberId') || null;
  });

  const { familyMembers, isLoading } = useFamilyMembers();

  const setSelectedMemberId = (id: string | null) => {
    setSelectedMemberIdState(id);
    // Persist to localStorage
    if (id === null) {
      localStorage.removeItem('selectedFamilyMemberId');
    } else {
      localStorage.setItem('selectedFamilyMemberId', id);
    }
  };

  const selectedMember = selectedMemberId 
    ? familyMembers.find(member => member.id === selectedMemberId) || null
    : null;

  // Reset selection if the selected family member no longer exists
  useEffect(() => {
    if (selectedMemberId && !isLoading && familyMembers.length > 0) {
      const memberExists = familyMembers.some(member => member.id === selectedMemberId);
      if (!memberExists) {
        setSelectedMemberId(null);
      }
    }
  }, [selectedMemberId, familyMembers, isLoading]);

  return (
    <FamilyMemberContext.Provider value={{
      selectedMemberId,
      selectedMember,
      setSelectedMemberId,
      familyMembers,
      isLoading
    }}>
      {children}
    </FamilyMemberContext.Provider>
  );
}

export function useFamilyMemberContext() {
  const context = useContext(FamilyMemberContext);
  if (context === undefined) {
    throw new Error('useFamilyMemberContext must be used within a FamilyMemberProvider');
  }
  return context;
}