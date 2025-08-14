import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, RefreshCw, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useProcessingQueue } from "@/hooks/useProcessingQueue";
import { useToast } from "@/hooks/use-toast";

export function ProcessingQueuePanel() {
  const { toast } = useToast();
  const {
    queueItems,
    stats,
    loading,
    fetchQueue,
    retryItem,
    cancelItem,
    retryAllFailed,
    clearCompleted,
    getItemsByStatus,
    getHighPriorityItems,
    getAverageProcessingTime
  } = useProcessingQueue();

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleRetryAll = async () => {
    try {
      await retryAllFailed();
      toast({
        title: "Success",
        description: "All failed items have been queued for retry",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to retry items",
        variant: "destructive",
      });
    }
  };

  const handleClearCompleted = async () => {
    try {
      await clearCompleted();
      toast({
        title: "Success",
        description: "Completed items have been cleared",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear completed items",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'processing':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing Queue</CardTitle>
          <CardDescription>Monitor document processing status and queue management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing Queue</CardTitle>
        <CardDescription>Monitor document processing status and queue management</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Queue Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold text-muted-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.queued}</div>
            <div className="text-xs text-muted-foreground">Queued</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetryAll}
            disabled={stats.failed === 0}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Failed ({stats.failed})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCompleted}
            disabled={stats.completed === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Completed ({stats.completed})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchQueue}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Processing Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-lg font-semibold">{getHighPriorityItems().length}</div>
            <div className="text-xs text-muted-foreground">High Priority Items</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-lg font-semibold">
              {getAverageProcessingTime() ? `${Math.round(getAverageProcessingTime() / 1000)}s` : 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground">Avg Processing Time</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-lg font-semibold">{getItemsByStatus('processing').length}</div>
            <div className="text-xs text-muted-foreground">Currently Processing</div>
          </div>
        </div>

        {/* Queue Items List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          <h4 className="font-medium text-sm text-muted-foreground mb-2">Recent Queue Items</h4>
          {queueItems.slice(0, 20).map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(item.status)}
                <div>
                  <div className="font-medium text-sm">Report ID: {item.report_id.slice(0, 8)}...</div>
                  <div className="text-xs text-muted-foreground">
                    Priority: {item.priority} | Attempts: {item.attempt_count}/{item.max_attempts}
                  </div>
                  {item.error_message && (
                    <div className="text-xs text-red-600 mt-1">{item.error_message}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusVariant(item.status)}>
                  {item.status}
                </Badge>
                {item.status === 'failed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => retryItem(item.id)}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
                {item.status === 'queued' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cancelItem(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {queueItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No items in processing queue
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}