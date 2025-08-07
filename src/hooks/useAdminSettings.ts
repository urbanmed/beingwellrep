import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminSetting {
  id: string;
  category: string;
  setting_key: string;
  setting_value: any;
  description?: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export const useAdminSettings = () => {
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Error fetching admin settings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch admin settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (id: string, value: any) => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .update({ 
          setting_value: value,
          updated_by: (await supabase.auth.getUser()).data.user?.id 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setSettings(prev => prev.map(setting => setting.id === id ? data : setting));
      toast({
        title: "Success",
        description: "Setting updated successfully",
      });
      return data;
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({
        title: "Error",
        description: "Failed to update setting",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getSettingsByCategory = (category: string) => {
    return settings.filter(setting => setting.category === category);
  };

  const getSetting = (category: string, key: string) => {
    return settings.find(setting => setting.category === category && setting.setting_key === key);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    fetchSettings,
    updateSetting,
    getSettingsByCategory,
    getSetting,
  };
};