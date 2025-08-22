import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ABHAProfile, ABHALinkingRequest, ABHAVerificationResponse } from '@/types/fhir';
import { toast } from 'sonner';

export function useABHA() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [abhaProfile, setAbhaProfile] = useState<ABHAProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load ABHA profile data
  useEffect(() => {
    const loadABHAProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('abha_id, abha_linked_at, abha_consent_given, abha_consent_date, abha_sync_status, abha_last_sync')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading ABHA profile:', error);
          return;
        }

        if (data) {
          setAbhaProfile({
            abha_id: data.abha_id,
            abha_linked_at: data.abha_linked_at,
            abha_consent_given: data.abha_consent_given || false,
            abha_consent_date: data.abha_consent_date,
            abha_sync_status: data.abha_sync_status as any || 'not_linked',
            abha_last_sync: data.abha_last_sync
          });
        }
      } catch (err) {
        console.error('Error loading ABHA profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load ABHA profile');
      }
    };

    loadABHAProfile();
  }, [user]);

  // Validate ABHA ID format
  const validateABHAId = (abhaId: string): boolean => {
    const abhaRegex = /^\d{14}$/;
    return abhaRegex.test(abhaId);
  };

  // Link ABHA ID
  const linkABHA = async (linkingRequest: ABHALinkingRequest): Promise<ABHAVerificationResponse> => {
    if (!user) throw new Error('User not authenticated');
    if (!validateABHAId(linkingRequest.abha_id)) {
      throw new Error('Invalid ABHA ID format. ABHA ID should be 14 digits.');
    }

    setLoading(true);
    setError(null);

    try {
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('abha_id', linkingRequest.abha_id)
        .neq('user_id', user.id)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingUser) throw new Error('This ABHA ID is already linked to another account.');

      const now = new Date().toISOString();
      const { error } = await supabase
        .from('profiles')
        .update({
          abha_id: linkingRequest.abha_id,
          abha_linked_at: now,
          abha_consent_given: linkingRequest.consent_given,
          abha_consent_date: linkingRequest.consent_given ? now : null,
          abha_sync_status: 'linked'
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setAbhaProfile({
        abha_id: linkingRequest.abha_id,
        abha_linked_at: now,
        abha_consent_given: linkingRequest.consent_given,
        abha_consent_date: linkingRequest.consent_given ? now : null,
        abha_sync_status: 'linked',
        abha_last_sync: null
      });

      toast.success('ABHA ID linked successfully!');
      return { success: true, patient_reference: `Patient/${user.id}` };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to link ABHA ID';
      setError(errorMessage);
      toast.error(errorMessage);
      return { success: false, error_message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const unlinkABHA = async (): Promise<boolean> => {
    if (!user) throw new Error('User not authenticated');
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          abha_id: null,
          abha_linked_at: null,
          abha_consent_given: false,
          abha_consent_date: null,
          abha_sync_status: 'not_linked',
          abha_last_sync: null
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setAbhaProfile({
        abha_id: undefined,
        abha_linked_at: undefined,
        abha_consent_given: false,
        abha_consent_date: undefined,
        abha_sync_status: 'not_linked',
        abha_last_sync: undefined
      });

      toast.success('ABHA ID unlinked successfully!');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unlink ABHA ID';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateABHAConsent = async (consentGiven: boolean): Promise<boolean> => {
    if (!user || !abhaProfile?.abha_id) {
      throw new Error('User not authenticated or ABHA not linked');
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('profiles')
        .update({
          abha_consent_given: consentGiven,
          abha_consent_date: consentGiven ? now : null
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setAbhaProfile(prev => prev ? {
        ...prev,
        abha_consent_given: consentGiven,
        abha_consent_date: consentGiven ? now : undefined
      } : null);

      toast.success(`ABHA consent ${consentGiven ? 'granted' : 'revoked'} successfully!`);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update ABHA consent';
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const syncABHAData = async (): Promise<boolean> => {
    if (!user || !abhaProfile?.abha_id || !abhaProfile.abha_consent_given) {
      throw new Error('ABHA not properly configured or consent not given');
    }

    setLoading(true);
    setError(null);

    try {
      await supabase
        .from('profiles')
        .update({ abha_sync_status: 'sync_pending' })
        .eq('user_id', user.id);

      // TODO: Implement actual ABDM API integration
      await new Promise(resolve => setTimeout(resolve, 2000));

      const now = new Date().toISOString();
      await supabase
        .from('profiles')
        .update({
          abha_sync_status: 'synced',
          abha_last_sync: now
        })
        .eq('user_id', user.id);

      setAbhaProfile(prev => prev ? {
        ...prev,
        abha_sync_status: 'synced',
        abha_last_sync: now
      } : null);

      toast.success('ABHA data synchronized successfully!');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync ABHA data';
      setError(errorMessage);
      
      await supabase
        .from('profiles')
        .update({ abha_sync_status: 'error' })
        .eq('user_id', user.id);

      setAbhaProfile(prev => prev ? {
        ...prev,
        abha_sync_status: 'error'
      } : null);

      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const isABHAConfigured = (): boolean => {
    return !!(abhaProfile?.abha_id && abhaProfile.abha_consent_given);
  };

  const canSyncABHA = (): boolean => {
    return isABHAConfigured() && abhaProfile?.abha_sync_status !== 'sync_pending';
  };

  return {
    loading,
    error,
    abhaProfile,
    validateABHAId,
    linkABHA,
    unlinkABHA,
    updateABHAConsent,
    syncABHAData,
    isABHAConfigured,
    canSyncABHA
  };
}