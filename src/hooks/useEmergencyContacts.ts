import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  relationship: string;
  phone_number: string;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface CreateEmergencyContactData {
  name: string;
  relationship: string;
  phone_number: string;
  priority?: number;
}

export function useEmergencyContacts() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchContacts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching emergency contacts:', error);
      toast({
        title: "Error loading contacts",
        description: "Failed to load emergency contacts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createContact = async (contactData: CreateEmergencyContactData) => {
    if (!user) return { error: 'No user authenticated' };

    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .insert([
          {
            ...contactData,
            user_id: user.id,
            priority: contactData.priority || contacts.length + 1,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setContacts(prev => [...prev, data].sort((a, b) => a.priority - b.priority));
      toast({
        title: "Contact added",
        description: "Emergency contact has been added successfully.",
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error creating emergency contact:', error);
      toast({
        title: "Error adding contact",
        description: "Failed to add emergency contact. Please try again.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const updateContact = async (id: string, updates: Partial<CreateEmergencyContactData>) => {
    if (!user) return { error: 'No user authenticated' };

    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setContacts(prev => 
        prev.map(contact => contact.id === id ? data : contact)
          .sort((a, b) => a.priority - b.priority)
      );
      
      toast({
        title: "Contact updated",
        description: "Emergency contact has been updated successfully.",
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error updating emergency contact:', error);
      toast({
        title: "Error updating contact",
        description: "Failed to update emergency contact. Please try again.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const deleteContact = async (id: string) => {
    if (!user) return { error: 'No user authenticated' };

    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setContacts(prev => prev.filter(contact => contact.id !== id));
      toast({
        title: "Contact deleted",
        description: "Emergency contact has been removed successfully.",
      });

      return { error: null };
    } catch (error) {
      console.error('Error deleting emergency contact:', error);
      toast({
        title: "Error deleting contact",
        description: "Failed to delete emergency contact. Please try again.",
        variant: "destructive",
      });
      return { error };
    }
  };

  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [user]);

  return {
    contacts,
    loading,
    createContact,
    updateContact,
    deleteContact,
    refetch: fetchContacts,
  };
}