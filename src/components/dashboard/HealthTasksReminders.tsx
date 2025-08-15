import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, CalendarCheck } from "lucide-react";
import { useReports } from "@/hooks/useReports";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { addMonths, isAfter, differenceInDays } from "date-fns";

interface HealthTask {
  id: string;
  title: string;
  description: string;
  dueDate?: Date;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  type: 'follow_up' | 'test_reminder' | 'medication' | 'appointment';
}

export function HealthTasksReminders() {
  const { reports } = useReports();
  const navigate = useNavigate();

  const tasks = useMemo(() => {
    const generatedTasks: HealthTask[] = [];
    
    // Analyze reports for follow-up recommendations
    const recentReports = reports
      .filter(r => r.parsing_status === 'completed')
      .sort((a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime())
      .slice(0, 10);

    // Check for overdue annual checkups
    const lastPhysical = recentReports.find(r => 
      r.report_type === 'general' && 
      r.title?.toLowerCase().includes('physical')
    );
    
    if (!lastPhysical || differenceInDays(new Date(), new Date(lastPhysical.report_date)) > 365) {
      generatedTasks.push({
        id: 'annual-physical',
        title: 'Schedule Annual Physical',
        description: 'Time for your yearly health checkup',
        priority: 'medium',
        completed: false,
        type: 'appointment'
      });
    }

    // Check for lab work recommendations
    const lastLabWork = recentReports.find(r => r.report_type === 'lab');
    if (!lastLabWork || differenceInDays(new Date(), new Date(lastLabWork.report_date)) > 180) {
      generatedTasks.push({
        id: 'lab-work',
        title: 'Schedule Lab Work',
        description: 'Regular blood work and health screening',
        priority: 'medium',
        completed: false,
        type: 'test_reminder'
      });
    }

    // Check for prescription refill reminders
    const prescriptionReports = recentReports.filter(r => r.report_type === 'prescription');
    prescriptionReports.forEach(report => {
      try {
        const data = typeof report.parsed_data === 'string' 
          ? JSON.parse(report.parsed_data) 
          : report.parsed_data;
        
        if (data?.medications) {
          data.medications.forEach((med: any) => {
            if (med.refills && parseInt(med.refills) <= 1) {
              generatedTasks.push({
                id: `refill-${med.name}`,
                title: 'Prescription Refill',
                description: `${med.name} - Low refills remaining`,
                priority: 'high',
                completed: false,
                type: 'medication'
              });
            }
          });
        }
      } catch (error) {
        console.warn('Error parsing prescription data:', error);
      }
    });

    // Add some general health reminders based on age/frequency
    if (recentReports.length > 0) {
      generatedTasks.push({
        id: 'health-update',
        title: 'Update Health Profile',
        description: 'Review and update your health information',
        priority: 'low',
        completed: false,
        type: 'follow_up'
      });
    }

    return generatedTasks.slice(0, 4); // Limit to 4 tasks
  }, [reports]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      default: return 'secondary';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'appointment': return CalendarCheck;
      case 'test_reminder': return Clock;
      case 'medication': return Circle;
      default: return CheckCircle2;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="medical-heading-sm flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle2 className="h-4 w-4 mr-2 text-primary" />
            Health Tasks
          </div>
          <Badge variant="outline" className="text-[10px] sm:text-xs">
            {tasks.filter(t => !t.completed).length} pending
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 sm:space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
            <p className="medical-annotation">All caught up! No pending health tasks.</p>
          </div>
        ) : (
          <>
            {tasks.map((task) => {
              const TypeIcon = getTypeIcon(task.type);
              return (
                <div key={task.id} className="flex items-start space-x-2 px-2 py-1.5 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="mt-0.5">
                    {task.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <TypeIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-medium">{task.title}</span>
                      <Badge variant={getPriorityColor(task.priority)} className="text-[10px] sm:text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{task.description}</p>
                  </div>
                </div>
              );
            })}
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full" 
              onClick={() => navigate('/profile')}
            >
              Manage Health Profile
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}