import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Target, Calendar, CheckCircle, AlertCircle, Clock, TrendingUp } from 'lucide-react';
import { useFHIRData } from '@/hooks/useFHIRData';
import { format, parseISO, differenceInDays, isAfter, isBefore } from 'date-fns';

interface CarePlanInfo {
  id: string;
  title: string;
  description?: string;
  status: string;
  intent: string;
  periodStart?: string;
  periodEnd?: string;
  goals: Goal[];
  activities: Activity[];
  progress: number;
  daysRemaining?: number;
  completedGoals: number;
  totalGoals: number;
}

interface Goal {
  id: string;
  description: string;
  target?: string;
  status: 'planned' | 'in-progress' | 'achieved' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
}

interface Activity {
  id: string;
  title: string;
  description: string;
  status: 'not-started' | 'scheduled' | 'in-progress' | 'completed';
  scheduledDate?: string;
}

export function CarePlanDashboard() {
  const { fetchFHIRCarePlans, loading } = useFHIRData();
  const [carePlans, setCarePlans] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');

  const loadCarePlans = async () => {
    try {
      const data = await fetchFHIRCarePlans();
      setCarePlans(data);
    } catch (error) {
      console.error('Failed to load FHIR care plans:', error);
    }
  };

  useEffect(() => {
    loadCarePlans();
  }, []);

  const carePlanInfo = useMemo(() => {
    return carePlans.map((plan): CarePlanInfo => {
      const resource = plan.resource_data;
      
      // Extract goals from resource
      const goals: Goal[] = resource?.goal?.map((goal: any, index: number) => ({
        id: goal.reference || `goal-${index}`,
        description: goal.display || `Goal ${index + 1}`,
        status: 'in-progress', // Default status
        priority: 'medium' as const,
        target: goal.target?.detailString
      })) || [];

      // Extract activities from resource
      const activities: Activity[] = resource?.activity?.map((activity: any, index: number) => ({
        id: `activity-${index}`,
        title: activity.detail?.description || `Activity ${index + 1}`,
        description: activity.detail?.reasonCode?.[0]?.text || '',
        status: activity.detail?.status === 'completed' ? 'completed' : 'in-progress',
        scheduledDate: activity.detail?.scheduledTiming?.event?.[0]
      })) || [];

      // Calculate progress
      const completedGoals = goals.filter(g => g.status === 'achieved').length;
      const completedActivities = activities.filter(a => a.status === 'completed').length;
      const totalTasks = goals.length + activities.length;
      const completedTasks = completedGoals + completedActivities;
      const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Calculate days remaining
      let daysRemaining: number | undefined;
      if (plan.period_end) {
        daysRemaining = Math.max(0, differenceInDays(parseISO(plan.period_end), new Date()));
      }

      return {
        id: plan.id,
        title: plan.title,
        description: plan.description,
        status: plan.status,
        intent: plan.intent,
        periodStart: plan.period_start,
        periodEnd: plan.period_end,
        goals,
        activities,
        progress: Math.round(progress),
        daysRemaining,
        completedGoals,
        totalGoals: goals.length
      };
    });
  }, [carePlans]);

  const filteredCarePlans = carePlanInfo.filter(plan => 
    selectedStatus === 'all' || plan.status === selectedStatus
  );

  const stats = useMemo(() => {
    const active = carePlanInfo.filter(p => p.status === 'active');
    const totalGoals = carePlanInfo.reduce((sum, p) => sum + p.totalGoals, 0);
    const completedGoals = carePlanInfo.reduce((sum, p) => sum + p.completedGoals, 0);
    const avgProgress = carePlanInfo.length > 0 
      ? carePlanInfo.reduce((sum, p) => sum + p.progress, 0) / carePlanInfo.length 
      : 0;
    
    return {
      total: carePlanInfo.length,
      active: active.length,
      totalGoals,
      completedGoals,
      avgProgress: Math.round(avgProgress)
    };
  }, [carePlanInfo]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'draft': return 'warning';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getGoalStatusIcon = (status: string) => {
    switch (status) {
      case 'achieved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in-progress': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Target className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Target className="h-8 w-8 animate-pulse mx-auto mb-2" />
          <p>Loading care plans...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Plans</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Plans</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Goals Achieved</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.completedGoals}/{stats.totalGoals}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Progress</p>
                <p className="text-2xl font-bold text-purple-600">{stats.avgProgress}%</p>
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-purple-600 flex items-center justify-center">
                <span className="text-xs font-bold text-purple-600">
                  {Math.round(stats.avgProgress / 10)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Care Plans List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Care Plans
            </CardTitle>
            <div className="flex gap-2">
              {['all', 'active', 'completed', 'cancelled'].map((status) => (
                <Button
                  key={status}
                  variant={selectedStatus === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStatus(status as any)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCarePlans.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">No Care Plans Found</p>
              <p className="text-muted-foreground">
                {selectedStatus === 'all' 
                  ? 'Care plans will appear here when created by healthcare providers.'
                  : `No ${selectedStatus} care plans found.`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredCarePlans.map((plan) => (
                <Card key={plan.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{plan.title}</h3>
                        {plan.description && (
                          <p className="text-muted-foreground mt-1">{plan.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={getStatusColor(plan.status)}>
                            {plan.status}
                          </Badge>
                          {plan.periodStart && (
                            <span className="text-sm text-muted-foreground">
                              Started {format(parseISO(plan.periodStart), 'MMM dd, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {plan.progress}%
                        </div>
                        <p className="text-sm text-muted-foreground">Complete</p>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Overall Progress</span>
                        <span className="text-sm font-medium">{plan.progress}%</span>
                      </div>
                      <Progress value={plan.progress} className="h-2" />
                    </div>

                    {plan.goals.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Goals ({plan.completedGoals}/{plan.totalGoals})
                        </h4>
                        <div className="space-y-2">
                          {plan.goals.slice(0, 3).map((goal) => (
                            <div key={goal.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-3">
                                {getGoalStatusIcon(goal.status)}
                                <span className="text-sm">{goal.description}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={getPriorityColor(goal.priority)}>
                                  {goal.priority}
                                </Badge>
                                <Badge variant="outline">
                                  {goal.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                          {plan.goals.length > 3 && (
                            <p className="text-sm text-muted-foreground text-center">
                              +{plan.goals.length - 3} more goals
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {plan.activities.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Activities ({plan.activities.filter(a => a.status === 'completed').length}/{plan.activities.length})
                        </h4>
                        <div className="space-y-2">
                          {plan.activities.slice(0, 2).map((activity) => (
                            <div key={activity.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div>
                                <span className="text-sm font-medium">{activity.title}</span>
                                {activity.description && (
                                  <p className="text-xs text-muted-foreground mt-1">{activity.description}</p>
                                )}
                              </div>
                              <Badge variant={activity.status === 'completed' ? 'success' : 'outline'}>
                                {activity.status}
                              </Badge>
                            </div>
                          ))}
                          {plan.activities.length > 2 && (
                            <p className="text-sm text-muted-foreground text-center">
                              +{plan.activities.length - 2} more activities
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {plan.daysRemaining !== undefined && plan.status === 'active' && (
                      <div className="flex items-center justify-between text-sm pt-4 border-t">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            {plan.daysRemaining > 0 
                              ? `${plan.daysRemaining} days remaining`
                              : 'Plan period ended'
                            }
                          </span>
                        </div>
                        {plan.periodEnd && (
                          <span className="text-muted-foreground">
                            Ends {format(parseISO(plan.periodEnd), 'MMM dd, yyyy')}
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}