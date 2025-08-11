import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Pill, 
  Stethoscope, 
  Crown, 
  Heart, 
  FileText, 
  Camera,
  Clock,
  MessageCircle,
  User,
  Calendar,
  Bell
} from "lucide-react";

export default function Concierge() {
  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="p-4 space-y-2">
        <h1 className="medical-heading text-foreground">Health Concierge</h1>
        <p className="medical-annotation text-muted-foreground">
          Premium health services with personalized care and support
        </p>
      </div>

      <div className="px-4 space-y-4">
        {/* Medication Refill Reminders */}
        <Card className="medical-card-shadow border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Pill className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="medical-subheading">Medication Refill Reminders</CardTitle>
                  <CardDescription className="medical-annotation">
                    Never miss a refill with smart notifications
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="medical-annotation">Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="justify-start gap-2 h-auto py-3">
                <Camera className="h-4 w-4" />
                <div className="text-left">
                  <div className="medical-annotation font-medium">Scan Prescription</div>
                  <div className="text-xs text-muted-foreground">OCR + Auto-setup</div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start gap-2 h-auto py-3">
                <Bell className="h-4 w-4" />
                <div className="text-left">
                  <div className="medical-annotation font-medium">Set Reminder</div>
                  <div className="text-xs text-muted-foreground">Manual entry</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Doctor Review Layer */}
        <Card className="medical-card-shadow border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-accent/50 p-2 rounded-lg">
                  <Stethoscope className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <CardTitle className="medical-subheading">Doctor Review Layer</CardTitle>
                  <CardDescription className="medical-annotation">
                    AI triage + human doctor consultation
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="medical-annotation">Hybrid AI</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="medical-annotation text-muted-foreground">How it works</span>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>1. Upload your case details</div>
                <div>2. AI performs initial triage</div>
                <div>3. Routed to our contracted doctors</div>
                <div>4. Get professional medical guidance</div>
              </div>
            </div>
            <Button className="w-full" variant="default">
              <FileText className="h-4 w-4 mr-2" />
              Upload Case Details
            </Button>
          </CardContent>
        </Card>

        {/* Premium Health Concierge */}
        <Card className="medical-card-shadow border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 p-2 rounded-lg">
                  <Crown className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="medical-subheading text-primary">Premium Health Concierge</CardTitle>
                  <CardDescription className="medical-annotation">
                    White-glove health management service
                  </CardDescription>
                </div>
              </div>
              <Badge className="medical-annotation bg-primary text-primary-foreground">Premium</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
                <User className="h-4 w-4 text-primary" />
                <div>
                  <div className="medical-annotation font-medium">Dedicated Health Manager</div>
                  <div className="text-xs text-muted-foreground">Personal healthcare coordinator</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
                <Calendar className="h-4 w-4 text-primary" />
                <div>
                  <div className="medical-annotation font-medium">Appointment Booking</div>
                  <div className="text-xs text-muted-foreground">We handle all scheduling</div>
                </div>
              </div>
            </div>
            <Button className="w-full" variant="default">
              <MessageCircle className="h-4 w-4 mr-2" />
              Chat with Health Manager
            </Button>
          </CardContent>
        </Card>

        {/* Personalized Wellness Plans */}
        <Card className="medical-card-shadow border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-secondary/50 p-2 rounded-lg">
                  <Heart className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <CardTitle className="medical-subheading">Personalized Wellness Plans</CardTitle>
                  <CardDescription className="medical-annotation">
                    AI-generated diet, exercise & lifestyle plans
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="medical-annotation">AI Powered</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="medical-annotation text-muted-foreground mb-2">Based on your:</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>• Medical history</div>
                <div>• Current medications</div>
                <div>• Lab results</div>
                <div>• Lifestyle factors</div>
              </div>
            </div>
            <Button className="w-full" variant="outline">
              <Heart className="h-4 w-4 mr-2" />
              Generate Wellness Plan
            </Button>
          </CardContent>
        </Card>

        {/* Basic Insurance Support */}
        <Card className="medical-card-shadow border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-muted p-2 rounded-lg">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="medical-subheading">Basic Insurance Support</CardTitle>
                  <CardDescription className="medical-annotation">
                    Step-by-step guidance for claims processing
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="medical-annotation">Manual</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="medical-annotation text-muted-foreground mb-2">We help with:</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>• Claim form review</div>
                <div>• Documentation guidance</div>
                <div>• Submission assistance</div>
                <div>• Follow-up support</div>
              </div>
            </div>
            <Button className="w-full" variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Upload Claim Forms
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}