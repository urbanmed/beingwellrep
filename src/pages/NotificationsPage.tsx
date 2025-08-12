import React from 'react';
import { Bell, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    notifications, 
    loading, 
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification 
  } = useNotifications();

  const getNotificationIcon = (type: Notification['type']) => {
    const icons = {
      info: '🔵',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      health: '🏥'
    };
    return icons[type] || '📢';
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'destructive';
    if (priority >= 3) return 'secondary';
    if (priority >= 2) return 'default';
    return 'outline';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
            >
              Mark all read
            </Button>
          )}
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No notifications</h3>
              <p className="text-muted-foreground">
                We'll notify you when something important happens
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`transition-colors ${
                  !notification.is_read ? 'bg-muted/30 border-primary/20' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <CardTitle className="text-base leading-6">
                          {notification.title}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={getPriorityColor(notification.priority)}
                            className="text-xs shrink-0"
                          >
                            {notification.category}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            className="h-8 w-8 p-0 shrink-0 hover:bg-destructive hover:text-destructive-foreground"
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-5">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), { 
                        addSuffix: true 
                      })}
                    </span>
                    
                    <div className="flex gap-2">
                      {notification.action_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="h-8 text-xs"
                        >
                          <a 
                            href={notification.action_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View
                          </a>
                        </Button>
                      )}
                      
                      {!notification.is_read && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                          className="h-8 text-xs"
                        >
                          Mark read
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;