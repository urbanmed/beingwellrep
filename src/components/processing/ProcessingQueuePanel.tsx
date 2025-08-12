import React from 'react';
import { Clock, AlertCircle, CheckCircle, XCircle, RotateCcw, Trash2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProcessingQueue, ProcessingQueueItem } from '@/hooks/useProcessingQueue';
import { formatDistanceToNow } from 'date-fns';

const ProcessingQueuePanel: React.FC = () => {
  const {
    queueItems,
    loading,
    stats,
    retryItem,
    setPriority,
    cancelItem,
    retryAllFailed,
    clearCompleted,
    getItemsByStatus,
    getAverageProcessingTime,
  } = useProcessingQueue();

  const getStatusIcon = (status: ProcessingQueueItem['status']) => {
    const icons = {
      queued: <Clock className="h-4 w-4 text-muted-foreground" />,
      processing: <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />,
      completed: <CheckCircle className="h-4 w-4 text-green-500" />,
      failed: <XCircle className="h-4 w-4 text-destructive" />,
      retrying: <RotateCcw className="h-4 w-4 text-orange-500 animate-spin" />,
    };
    return icons[status];
  };

  const getStatusBadgeVariant = (status: ProcessingQueueItem['status']) => {
    const variants = {
      queued: 'secondary',
      processing: 'default',
      completed: 'default',
      failed: 'destructive',
      retrying: 'secondary',
    };
    return variants[status] as any;
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 4) return 'Urgent';
    if (priority >= 3) return 'High';
    if (priority >= 2) return 'Medium';
    return 'Low';
  };

  const QueueItemCard: React.FC<{ item: ProcessingQueueItem }> = ({ item }) => (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon(item.status)}
            <div>
              <div className="font-medium text-sm">Report {item.report_id.slice(0, 8)}</div>
              <div className="text-xs text-muted-foreground">
                Priority: {getPriorityLabel(item.priority)}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(item.status)}>
              {item.status}
            </Badge>
            
            {item.status === 'failed' && item.attempt_count < item.max_attempts && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => retryItem(item.id)}
                className="h-7"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
            
            {item.status === 'queued' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => cancelItem(item.id)}
                className="h-7 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Attempts:</span>
            <span>{item.attempt_count}/{item.max_attempts}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Created:</span>
            <span>
              {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
            </span>
          </div>
          
          {item.processing_time_ms && (
            <div className="flex justify-between">
              <span>Processing time:</span>
              <span>{Math.round(item.processing_time_ms / 1000)}s</span>
            </div>
          )}
          
          {item.error_message && (
            <div className="p-2 bg-destructive/10 rounded text-destructive text-xs">
              <AlertCircle className="h-3 w-3 inline mr-1" />
              {item.error_message}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>Loading processing queue...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-muted-foreground">{stats.queued}</div>
            <div className="text-xs text-muted-foreground">Queued</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{stats.processing}</div>
            <div className="text-xs text-muted-foreground">Processing</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-500">{stats.retrying}</div>
            <div className="text-xs text-muted-foreground">Retrying</div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Queue Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={retryAllFailed}
              disabled={stats.failed === 0}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry All Failed ({stats.failed})
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={clearCompleted}
              disabled={stats.completed === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Completed ({stats.completed})
            </Button>
            
            <div className="ml-auto text-sm text-muted-foreground">
              Avg processing time: {Math.round(getAverageProcessingTime() / 1000)}s
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue Items */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="queued">Queued ({stats.queued})</TabsTrigger>
          <TabsTrigger value="processing">Processing ({stats.processing})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({stats.completed})</TabsTrigger>
          <TabsTrigger value="failed">Failed ({stats.failed})</TabsTrigger>
          <TabsTrigger value="retrying">Retrying ({stats.retrying})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {queueItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No items in queue</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {queueItems.map((item) => (
                <QueueItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </TabsContent>

        {(['queued', 'processing', 'completed', 'failed', 'retrying'] as const).map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {getItemsByStatus(status).map((item) => (
                <QueueItemCard key={item.id} item={item} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default ProcessingQueuePanel;