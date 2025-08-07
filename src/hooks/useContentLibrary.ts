import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ContentItem {
  id: string;
  title: string;
  type: 'template' | 'guideline' | 'educational';
  status: 'draft' | 'published' | 'archived';
  content: string;
  description?: string;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useContentLibrary = () => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchContent = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('content_library')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContent((data || []) as ContentItem[]);
    } catch (error) {
      console.error('Error fetching content:', error);
      toast({
        title: "Error",
        description: "Failed to fetch content library",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createContent = async (newContent: Omit<ContentItem, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    try {
      const { data, error } = await supabase
        .from('content_library')
        .insert([{ ...newContent, created_by: (await supabase.auth.getUser()).data.user?.id }])
        .select()
        .single();

      if (error) throw error;
      setContent(prev => [data as ContentItem, ...prev]);
      toast({
        title: "Success",
        description: "Content created successfully",
      });
      return data;
    } catch (error) {
      console.error('Error creating content:', error);
      toast({
        title: "Error",
        description: "Failed to create content",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateContent = async (id: string, updates: Partial<ContentItem>) => {
    try {
      const { data, error } = await supabase
        .from('content_library')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setContent(prev => prev.map(item => item.id === id ? data as ContentItem : item));
      toast({
        title: "Success",
        description: "Content updated successfully",
      });
      return data;
    } catch (error) {
      console.error('Error updating content:', error);
      toast({
        title: "Error",
        description: "Failed to update content",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteContent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('content_library')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setContent(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Success",
        description: "Content deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting content:', error);
      toast({
        title: "Error",
        description: "Failed to delete content",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  return {
    content,
    loading,
    fetchContent,
    createContent,
    updateContent,
    deleteContent,
  };
};