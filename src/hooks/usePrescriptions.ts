import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Prescription {
  id: string;
  user_id: string;
  family_member_id?: string;
  report_id: string;
  source_report_id?: string;
  medication_name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  prescribing_doctor?: string;
  pharmacy?: string;
  status: string;
  notes?: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  // Related data
  report?: {
    id: string;
    title: string;
    file_url?: string;
    file_name: string;
  };
  source_report?: {
    id: string;
    title: string;
  };
  family_member?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export function usePrescriptions() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          report:reports!prescriptions_report_id_fkey(id, title, file_url, file_name),
          source_report:reports!prescriptions_source_report_id_fkey(id, title),
          family_member:family_members(id, first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch prescriptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createPrescription = async (prescriptionData: {
    report_id: string;
    source_report_id?: string;
    medication_name: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    prescribing_doctor?: string;
    pharmacy?: string;
    family_member_id?: string;
    notes?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .insert([{ ...prescriptionData, user_id: (await supabase.auth.getUser()).data.user?.id }])
        .select(`
          *,
          report:reports!prescriptions_report_id_fkey(id, title, file_url, file_name),
          source_report:reports!prescriptions_source_report_id_fkey(id, title),
          family_member:family_members(id, first_name, last_name)
        `)
        .single();

      if (error) throw error;
      
      setPrescriptions(prev => [data, ...prev]);
      toast({
        title: "Success",
        description: "Prescription added successfully",
      });
      
      return { data, error: null };
    } catch (error) {
      console.error('Error creating prescription:', error);
      toast({
        title: "Error",
        description: "Failed to add prescription",
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const updatePrescriptionStatus = async (id: string, status: string) => {
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .update({ status })
        .eq('id', id)
        .select(`
          *,
          report:reports!prescriptions_report_id_fkey(id, title, file_url, file_name),
          source_report:reports!prescriptions_source_report_id_fkey(id, title),
          family_member:family_members(id, first_name, last_name)
        `)
        .single();

      if (error) throw error;

      setPrescriptions(prev => 
        prev.map(prescription => 
          prescription.id === id ? data : prescription
        )
      );
      
      toast({
        title: "Success",
        description: `Prescription marked as ${status}`,
      });
      
      return { data, error: null };
    } catch (error) {
      console.error('Error updating prescription:', error);
      toast({
        title: "Error",
        description: "Failed to update prescription",
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const deletePrescription = async (id: string) => {
    try {
      const { error } = await supabase
        .from('prescriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPrescriptions(prev => prev.filter(prescription => prescription.id !== id));
      toast({
        title: "Success",
        description: "Prescription deleted successfully",
      });
      
      return { error: null };
    } catch (error) {
      console.error('Error deleting prescription:', error);
      toast({
        title: "Error",
        description: "Failed to delete prescription",
        variant: "destructive",
      });
      return { error };
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  return {
    prescriptions,
    loading,
    fetchPrescriptions,
    createPrescription,
    updatePrescriptionStatus,
    deletePrescription,
  };
}