import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AuditLog {
  id: string;
  admin_user_id: string;
  action: string;
  target_type: string;
  target_id?: string;
  details: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export const useAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const { toast } = useToast();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (searchTerm) {
        query = query.or(`action.ilike.%${searchTerm}%,target_type.ilike.%${searchTerm}%,details->>user_name.ilike.%${searchTerm}%`);
      }

      if (actionFilter) {
        query = query.eq('action', actionFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs((data || []) as AuditLog[]);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch audit logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convert to CSV
      const headers = ['Date', 'Admin ID', 'Action', 'Target Type', 'Target ID', 'IP Address', 'Status'];
      const csvContent = [
        headers.join(','),
        ...(data || []).map(log => [
          new Date(log.created_at).toLocaleString(),
          log.admin_user_id,
          log.action,
          log.target_type,
          log.target_id || '',
          log.ip_address || '',
          'Success' // Assuming success since error logs would be handled differently
        ].map(field => `"${field}"`).join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: "Audit logs exported successfully",
      });
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast({
        title: "Error",
        description: "Failed to export audit logs",
        variant: "destructive",
      });
    }
  };

  const logAdminAction = async (action: string, targetType: string, targetId?: string, details?: any) => {
    try {
      const { error } = await supabase
        .from('admin_audit_logs')
        .insert([{
          admin_user_id: (await supabase.auth.getUser()).data.user?.id,
          action,
          target_type: targetType,
          target_id: targetId,
          details: details || {},
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [searchTerm, actionFilter]);

  return {
    logs,
    loading,
    searchTerm,
    setSearchTerm,
    actionFilter,
    setActionFilter,
    fetchLogs,
    exportLogs,
    logAdminAction,
  };
};