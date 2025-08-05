import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, User, Phone, Mail, Hash, Award } from "lucide-react";
import { Provider } from "@/types/medical-data";

interface EnhancedProviderInfoCardProps {
  provider?: Provider;
  title?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function EnhancedProviderInfoCard({ 
  provider, 
  title = "Provider Information",
  icon: Icon = Stethoscope 
}: EnhancedProviderInfoCardProps) {
  if (!provider || Object.keys(provider).length === 0) {
    return null;
  }

  const fullName = provider.name || `${provider.firstName || ''} ${provider.lastName || ''}`.trim();
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fullName && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div className="font-medium text-foreground">{fullName}</div>
            {provider.title && (
              <Badge variant="outline" className="text-xs">
                {provider.title}
              </Badge>
            )}
          </div>
        )}
        
        {provider.specialty && (
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Specialty:</span>
            <Badge variant="secondary" className="text-xs">
              {provider.specialty}
            </Badge>
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-3 text-sm">
          {provider.npi && (
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">NPI:</span>
              <span className="font-medium font-mono">{provider.npi}</span>
            </div>
          )}
          
          {provider.license && (
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">License:</span>
              <span className="font-medium font-mono">{provider.license}</span>
            </div>
          )}
          
          {provider.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-medium">{provider.phone}</span>
            </div>
          )}
          
          {provider.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{provider.email}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}