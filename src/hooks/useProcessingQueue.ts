import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProcessingQueueItem {
  id: string;
  user_id: string;
  report_id: string;
  priority: number;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'retrying';
  attempt_count: number;
  max_attempts: number;
  error_message?: string;
  processing_started_at?: string;
  processing_completed_at?: string;
  estimated_completion_time?: string;
  processing_time_ms?: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const useProcessingQueue = () => {
  const [queueItems, setQueueItems] = useState<ProcessingQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    retrying: 0,
  });
  const { toast } = useToast();

  // Fetch queue items
  const fetchQueue = async () => {
    try {
      const { data, error } = await supabase
        .from('processing_queue')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      setQueueItems((data as ProcessingQueueItem[]) || []);
      
      // Calculate stats
      const items = data || [];
      setStats({
        total: items.length,
        queued: items.filter(i => i.status === 'queued').length,
        processing: items.filter(i => i.status === 'processing').length,
        completed: items.filter(i => i.status === 'completed').length,
        failed: items.filter(i => i.status === 'failed').length,
        retrying: items.filter(i => i.status === 'retrying').length,
      });
    } catch (error) {
      console.error('Error fetching processing queue:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add item to queue
  const addToQueue = async (reportId: string, priority: number = 1, metadata: Record<string, any> = {}) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('processing_queue')
        .insert({
          user_id: userData.user.id,
          report_id: reportId,
          priority,
          status: 'queued',
          metadata,
        })
        .select()
        .single();

      if (error) throw error;

      setQueueItems(prev => [...prev, data as ProcessingQueueItem]);
      return data;
    } catch (error) {
      console.error('Error adding to queue:', error);
      throw error;
    }
  };

  // Update queue item status
  const updateQueueItem = async (
    queueId: string, 
    updates: Partial<ProcessingQueueItem>
  ) => {
    try {
      const { data, error } = await supabase
        .from('processing_queue')
        .update(updates)
        .eq('id', queueId)
        .select()
        .single();

      if (error) throw error;

      setQueueItems(prev => 
        prev.map(item => 
          item.id === queueId ? { ...item, ...(data as ProcessingQueueItem) } : item
        )
      );

      return data;
    } catch (error) {
      console.error('Error updating queue item:', error);
      throw error;
    }
  };

  // Retry failed item
  const retryItem = async (queueId: string) => {
    try {
      const item = queueItems.find(i => i.id === queueId);
      if (!item) throw new Error('Queue item not found');

      if (item.attempt_count >= item.max_attempts) {
        throw new Error('Maximum retry attempts reached');
      }

      await updateQueueItem(queueId, {
        status: 'retrying',
        attempt_count: item.attempt_count + 1,
        error_message: null,
      });

      toast({
        title: "Retry Initiated",
        description: "Document processing has been queued for retry.",
      });
    } catch (error) {
      console.error('Error retrying item:', error);
      toast({
        title: "Retry Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Set priority
  const setPriority = async (queueId: string, priority: number) => {
    try {
      await updateQueueItem(queueId, { priority });
      
      toast({
        title: "Priority Updated",
        description: `Queue item priority set to ${priority}.`,
      });
    } catch (error) {
      console.error('Error setting priority:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update priority.",
        variant: "destructive",
      });
    }
  };

  // Cancel queued item
  const cancelItem = async (queueId: string) => {
    try {
      const { error } = await supabase
        .from('processing_queue')
        .delete()
        .eq('id', queueId);

      if (error) throw error;

      setQueueItems(prev => prev.filter(item => item.id !== queueId));
      
      toast({
        title: "Item Cancelled",
        description: "Queue item has been removed.",
      });
    } catch (error) {
      console.error('Error cancelling item:', error);
      toast({
        title: "Cancellation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Bulk retry failed items
  const retryAllFailed = async () => {
    try {
      const failedItems = queueItems.filter(
        item => item.status === 'failed' && item.attempt_count < item.max_attempts
      );

      if (failedItems.length === 0) {
        toast({
          title: "No Items to Retry",
          description: "There are no failed items eligible for retry.",
        });
        return;
      }

      const updates = failedItems.map(item => ({
        id: item.id,
        status: 'retrying' as const,
        attempt_count: item.attempt_count + 1,
        error_message: null,
      }));

      for (const update of updates) {
        await updateQueueItem(update.id, update);
      }

      toast({
        title: "Bulk Retry Initiated",
        description: `${failedItems.length} items queued for retry.`,
      });
    } catch (error) {
      console.error('Error in bulk retry:', error);
      toast({
        title: "Bulk Retry Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Clear completed items
  const clearCompleted = async () => {
    try {
      const completedIds = queueItems
        .filter(item => item.status === 'completed')
        .map(item => item.id);

      if (completedIds.length === 0) {
        toast({
          title: "No Completed Items",
          description: "There are no completed items to clear.",
        });
        return;
      }

      const { error } = await supabase
        .from('processing_queue')
        .delete()
        .in('id', completedIds);

      if (error) throw error;

      setQueueItems(prev => prev.filter(item => !completedIds.includes(item.id)));
      
      toast({
        title: "Completed Items Cleared",
        description: `${completedIds.length} completed items removed.`,
      });
    } catch (error) {
      console.error('Error clearing completed items:', error);
      toast({
        title: "Clear Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    fetchQueue();

    const channel = supabase
      .channel('processing-queue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'processing_queue',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setQueueItems(prev => [...prev, payload.new as ProcessingQueueItem]);
          } else if (payload.eventType === 'UPDATE') {
            setQueueItems(prev => 
              prev.map(item => 
                item.id === payload.new.id ? payload.new as ProcessingQueueItem : item
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setQueueItems(prev => prev.filter(item => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Helper functions
  const getItemsByStatus = (status: ProcessingQueueItem['status']) => {
    return queueItems.filter(item => item.status === status);
  };

  const getHighPriorityItems = () => {
    return queueItems.filter(item => item.priority >= 3);
  };

  const getAverageProcessingTime = () => {
    const completedItems = queueItems.filter(
      item => item.status === 'completed' && item.processing_time_ms
    );
    
    if (completedItems.length === 0) return 0;
    
    const total = completedItems.reduce(
      (sum, item) => sum + (item.processing_time_ms || 0), 
      0
    );
    
    return Math.round(total / completedItems.length);
  };

  return {
    queueItems,
    loading,
    stats,
    addToQueue,
    updateQueueItem,
    retryItem,
    setPriority,
    cancelItem,
    retryAllFailed,
    clearCompleted,
    fetchQueue,
    getItemsByStatus,
    getHighPriorityItems,
    getAverageProcessingTime,
  };
};