import React from 'react';
import { Brain, TrendingUp, AlertTriangle, Target, Award, Sparkles, X, MoreHorizontal, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useHealthInsights, HealthInsight } from '@/hooks/useHealthInsights';
import { useSummaries } from '@/hooks/useSummaries';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { getContentPreview, getSeverityBadge } from '@/lib/utils/summary-parser';

const HealthInsightsPanel: React.FC = () => {
  const navigate = useNavigate();
  const {
    insights,
    loading,
    generating,
    generateInsights,
    dismissInsight,
    deleteInsight,
    getInsightsByType,
    getInsightsBySeverity,
    getCriticalInsights,
    getInsightStats,
  } = useHealthInsights();

  const { summaries } = useSummaries();
  const recentSummaries = summaries
    .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime())
    .slice(0, 5);

  const stats = getInsightStats();

  const getInsightIcon = (type: HealthInsight['insight_type']) => {
    const icons = {
      trend: <TrendingUp className="h-5 w-5 text-blue-500" />,
      risk: <AlertTriangle className="h-5 w-5 text-red-500" />,
      recommendation: <Target className="h-5 w-5 text-green-500" />,
      milestone: <Award className="h-5 w-5 text-purple-500" />,
    };
    return icons[type];
  };

  const getSeverityBadgeVariant = (severity: HealthInsight['severity']) => {
    const variants = {
      info: 'default',
      warning: 'secondary',
      critical: 'destructive',
    };
    return variants[severity] as any;
  };

  const getSeverityColor = (severity: HealthInsight['severity']) => {
    const colors = {
      info: 'text-blue-500',
      warning: 'text-orange-500',
      critical: 'text-red-500',
    };
    return colors[severity];
  };

  const InsightCard: React.FC<{ insight: HealthInsight }> = ({ insight }) => (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {getInsightIcon(insight.insight_type)}
            <div>
              <CardTitle className="text-base leading-6">
                {insight.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={getSeverityBadgeVariant(insight.severity)}>
                  {insight.severity}
                </Badge>
                {insight.confidence_score && (
                  <div className="text-xs text-muted-foreground">
                    {Math.round(insight.confidence_score * 100)}% confidence
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => dismissInsight(insight.id)}>
                Dismiss
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => deleteInsight(insight.id)}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground leading-5 mb-4">
          {insight.description}
        </p>

        {insight.action_items && insight.action_items.length > 0 && (
          <div className="space-y-2 mb-4">
            <div className="text-sm font-medium">Action Items:</div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {insight.action_items.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {formatDistanceToNow(new Date(insight.created_at), { addSuffix: true })}
          </span>
          {insight.expires_at && (
            <span>
              Expires {formatDistanceToNow(new Date(insight.expires_at), { addSuffix: true })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const SummaryCard: React.FC<{ summary: any }> = ({ summary }) => {
    const severityBadgeRaw = getSeverityBadge(summary.content);
    const severityBadge = severityBadgeRaw ?? { variant: 'secondary' as const, label: 'Info' };
    const preview = getContentPreview(summary.content, 120);

    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/summaries')}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base leading-6">
                  {summary.title}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={severityBadge.variant} className="text-xs">
                    {severityBadge.label}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize">
                    {summary.summary_type.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground leading-5 mb-4">
            {preview}
          </p>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {formatDistanceToNow(new Date(summary.generated_at), { addSuffix: true })}
            </span>
            {summary.confidence_score && (
              <span>
                {Math.round(summary.confidence_score * 100)}% confidence
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>Loading health insights...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Generate Button */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="h-6 w-6" />
              <div>
                <CardTitle>Health Insights</CardTitle>
                <p className="text-sm text-muted-foreground">
                  AI-powered insights from your health data
                </p>
              </div>
            </div>
            
            <Button
              onClick={generateInsights}
              disabled={generating}
              className="flex items-center gap-2"
            >
              {generating ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? 'Generating...' : 'Generate Insights'}
            </Button>
          </div>
        </CardHeader>
      </Card>

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
            <div className="text-2xl font-bold text-blue-500">{stats.trends}</div>
            <div className="text-xs text-muted-foreground">Trends</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-500">{stats.risks}</div>
            <div className="text-xs text-muted-foreground">Risks</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{stats.recommendations}</div>
            <div className="text-xs text-muted-foreground">Recommendations</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-500">{stats.milestones}</div>
            <div className="text-xs text-muted-foreground">Milestones</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-500">{stats.critical}</div>
            <div className="text-xs text-muted-foreground">Critical</div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Insights Alert */}
      {getCriticalInsights().length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <CardTitle className="text-red-700 dark:text-red-300">
                Critical Health Insights
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">
              You have {getCriticalInsights().length} critical health insight(s) that require immediate attention.
            </p>
            <div className="space-y-3">
              {getCriticalInsights().slice(0, 2).map((insight) => (
                <div key={insight.id} className="text-sm">
                  <div className="font-medium text-red-700 dark:text-red-300">
                    {insight.title}
                  </div>
                  <div className="text-red-600 dark:text-red-400">
                    {insight.description}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All ({stats.total + recentSummaries.length})</TabsTrigger>
          <TabsTrigger value="summaries">AI Summaries ({recentSummaries.length})</TabsTrigger>
          <TabsTrigger value="trend">Trends ({stats.trends})</TabsTrigger>
          <TabsTrigger value="risk">Risks ({stats.risks})</TabsTrigger>
          <TabsTrigger value="recommendation">Tips ({stats.recommendations})</TabsTrigger>
          <TabsTrigger value="milestone">Milestones ({stats.milestones})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {insights.length === 0 && recentSummaries.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No health insights yet</p>
                <p className="text-sm">Click "Generate Insights" to analyze your health data</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentSummaries.map((summary) => (
                <SummaryCard key={summary.id} summary={summary} />
              ))}
              {insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="summaries" className="space-y-4">
          {recentSummaries.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No AI summaries yet</p>
                <p className="text-sm">Generate summaries from your medical reports to see AI insights</p>
                <Button 
                  className="mt-4" 
                  onClick={() => navigate('/summaries')}
                >
                  View Summaries
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentSummaries.map((summary) => (
                <SummaryCard key={summary.id} summary={summary} />
              ))}
            </div>
          )}
        </TabsContent>

        {(['trend', 'risk', 'recommendation', 'milestone'] as const).map((type) => (
          <TabsContent key={type} value={type} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {getInsightsByType(type).map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default HealthInsightsPanel;