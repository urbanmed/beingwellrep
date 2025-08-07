import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Clock, 
  Info, 
  X, 
  Calendar, 
  ExternalLink,
  MoreHorizontal,
  Undo2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDismissedRecommendations } from "@/hooks/useDismissedRecommendations";
import { addToDeviceCalendar, createGoogleCalendarUrl } from "@/lib/utils/calendar";

interface Recommendation {
  test: string;
  urgency: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  reason: string;
  lastDone?: string;
  specialty?: string;
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  onDismiss?: () => void;
}

const urgencyConfig = {
  critical: {
    icon: AlertTriangle,
    color: "destructive",
    bgColor: "bg-destructive/10 dark:bg-destructive/20",
    borderColor: "border-destructive/20 dark:border-destructive/30",
    textColor: "text-destructive",
    label: "Critical"
  },
  high: {
    icon: AlertTriangle,
    color: "orange",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-200 dark:border-orange-800",
    textColor: "text-orange-700 dark:text-orange-400",
    label: "High Priority"
  },
  medium: {
    icon: Clock,
    color: "yellow",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    textColor: "text-yellow-700 dark:text-yellow-400",
    label: "Medium Priority"
  },
  low: {
    icon: Clock,
    color: "blue",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    textColor: "text-blue-700 dark:text-blue-400",
    label: "Low Priority"
  },
  informational: {
    icon: Info,
    color: "secondary",
    bgColor: "bg-muted/50",
    borderColor: "border-muted",
    textColor: "text-muted-foreground",
    label: "Informational"
  }
};

export function RecommendationCard({ recommendation, onDismiss }: RecommendationCardProps) {
  const { dismissRecommendation, undismissRecommendation, isDismissed } = useDismissedRecommendations();
  const [dismissDialog, setDismissDialog] = useState(false);
  const [dismissReason, setDismissReason] = useState("");
  const [dismissDuration, setDismissDuration] = useState<string>("30");

  const config = urgencyConfig[recommendation.urgency];
  const Icon = config.icon;
  const recommendationKey = `${recommendation.test}-${recommendation.specialty || 'general'}`;
  const dismissed = isDismissed('medical_test', recommendationKey);

  const handleDismiss = async () => {
    const days = dismissDuration === "permanent" ? undefined : parseInt(dismissDuration);
    await dismissRecommendation('medical_test', recommendationKey, dismissReason, days);
    setDismissDialog(false);
    setDismissReason("");
    onDismiss?.();
  };

  const handleUndismiss = async () => {
    await undismissRecommendation('medical_test', recommendationKey);
    onDismiss?.();
  };

  const handleScheduleAppointment = () => {
    const event = {
      title: `${recommendation.test} Appointment`,
      description: `Recommended medical test: ${recommendation.test}\n\nReason: ${recommendation.reason}${recommendation.specialty ? `\n\nSpecialty: ${recommendation.specialty}` : ''}`,
      location: 'Medical Facility',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1 hour appointment
    };

    addToDeviceCalendar(event);
  };

  const openGoogleCalendar = () => {
    const event = {
      title: `${recommendation.test} Appointment`,
      description: `Recommended medical test: ${recommendation.test}\n\nReason: ${recommendation.reason}${recommendation.specialty ? `\n\nSpecialty: ${recommendation.specialty}` : ''}`,
      location: 'Medical Facility',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
    };

    window.open(createGoogleCalendarUrl(event), '_blank');
  };

  if (dismissed) {
    return (
      <Card className="border-dashed border-muted bg-muted/30">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 opacity-60">
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">{recommendation.test}</span>
              <Badge variant="outline" className="text-xs">Dismissed</Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndismiss}
              className="h-8 px-2"
            >
              <Undo2 className="h-3 w-3 mr-1" />
              Restore
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={`${config.bgColor} ${config.borderColor} border-2`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <Icon className={`h-4 w-4 ${config.textColor}`} />
              <CardTitle className="text-sm font-medium">{recommendation.test}</CardTitle>
              <Badge variant={config.color as any} className="text-xs">
                {config.label}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleScheduleAppointment}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Add to Calendar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openGoogleCalendar}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Google Calendar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDismissDialog(true)}>
                  <X className="h-4 w-4 mr-2" />
                  Dismiss
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-3">{recommendation.reason}</p>
          
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {recommendation.lastDone && (
              <span>Last done: {recommendation.lastDone}</span>
            )}
            {recommendation.specialty && (
              <Badge variant="outline" className="text-xs">
                {recommendation.specialty}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dismissDialog} onOpenChange={setDismissDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dismiss Recommendation</DialogTitle>
            <DialogDescription>
              How long would you like to hide this recommendation?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Duration</label>
              <Select value={dismissDuration} onValueChange={setDismissDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">1 week</SelectItem>
                  <SelectItem value="30">1 month</SelectItem>
                  <SelectItem value="90">3 months</SelectItem>
                  <SelectItem value="180">6 months</SelectItem>
                  <SelectItem value="permanent">Permanently</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Reason (optional)</label>
              <Textarea
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                placeholder="Why are you dismissing this recommendation?"
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDismissDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleDismiss}>
              Dismiss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}