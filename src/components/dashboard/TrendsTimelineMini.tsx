import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import { useReports } from "@/hooks/useReports";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { format, subMonths } from "date-fns";

export function TrendsTimelineMini() {
  const { reports } = useReports();
  const navigate = useNavigate();

  const chartData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i);
      return {
        month: format(date, 'MMM'),
        reports: 0,
        processed: 0
      };
    });

    reports.forEach(report => {
      const reportDate = new Date(report.created_at);
      const monthIndex = last6Months.findIndex(month => 
        format(reportDate, 'MMM') === month.month && 
        reportDate.getFullYear() === new Date().getFullYear()
      );
      
      if (monthIndex !== -1) {
        last6Months[monthIndex].reports++;
        if (report.parsing_status === 'completed') {
          last6Months[monthIndex].processed++;
        }
      }
    });

    return last6Months;
  }, [reports]);

  const trends = useMemo(() => {
    const thisMonth = chartData[chartData.length - 1]?.reports || 0;
    const lastMonth = chartData[chartData.length - 2]?.reports || 0;
    const change = thisMonth - lastMonth;
    
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      value: Math.abs(change),
      percentage: lastMonth > 0 ? Math.round((change / lastMonth) * 100) : 0
    };
  }, [chartData]);

  const getTrendIcon = () => {
    switch (trends.direction) {
      case 'up': return <TrendingUp className="h-4 w-4 text-success" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-warning" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendText = () => {
    if (trends.direction === 'stable') return 'No change from last month';
    const direction = trends.direction === 'up' ? 'increase' : 'decrease';
    return `${trends.percentage}% ${direction} from last month`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="medical-heading-sm flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-primary" />
            Activity Trends
          </div>
          {getTrendIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10 }}
              />
              <YAxis hide />
              <Line 
                type="monotone" 
                dataKey="reports" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 4, stroke: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="medical-annotation">This Month</span>
            <span className="medical-label font-medium">
              {chartData[chartData.length - 1]?.reports || 0} reports
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="medical-annotation">Trend</span>
            <span className="medical-annotation">{getTrendText()}</span>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full" 
          onClick={() => navigate('/vault')}
        >
          View Full Timeline
        </Button>
      </CardContent>
    </Card>
  );
}