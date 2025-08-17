import { AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PriorityIconProps {
  priority: 'high' | 'medium' | 'low';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

const priorityConfig = {
  high: {
    icon: AlertTriangle,
    bgColor: 'bg-destructive',
    iconColor: 'text-destructive-foreground',
    label: 'High Priority'
  },
  medium: {
    icon: Clock,
    bgColor: 'bg-warning',
    iconColor: 'text-warning-foreground',
    label: 'Medium Priority'
  },
  low: {
    icon: CheckCircle,
    bgColor: 'bg-success',
    iconColor: 'text-success-foreground',
    label: 'Low Priority'
  }
};

const sizeConfig = {
  sm: {
    container: 'h-5 w-5',
    icon: 3
  },
  md: {
    container: 'h-6 w-6',
    icon: 4
  },
  lg: {
    container: 'h-8 w-8',
    icon: 5
  }
};

export function PriorityIcon({ 
  priority, 
  size = 'md', 
  className, 
  showTooltip = true 
}: PriorityIconProps) {
  const config = priorityConfig[priority];
  const sizeConf = sizeConfig[size];
  const IconComponent = config.icon;

  const iconElement = (
    <div 
      className={cn(
        "rounded-full flex items-center justify-center",
        config.bgColor,
        sizeConf.container,
        className
      )}
    >
      <IconComponent 
        size={sizeConf.icon * 4} 
        className={config.iconColor}
        strokeWidth={2}
      />
    </div>
  );

  if (!showTooltip) {
    return iconElement;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {iconElement}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}