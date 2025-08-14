import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill } from "lucide-react";

export default function Prescriptions() {
  useEffect(() => {
    document.title = "Prescriptions | Health Dashboard";
  }, []);

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-2">
        <h1 className="medical-heading-sm">Prescriptions</h1>
        <p className="medical-annotation text-muted-foreground">Manage and track your medications securely.</p>
      </div>

      <Card className="medical-card-shadow">
        <CardHeader>
          <CardTitle className="medical-subheading flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            Your Prescriptions
          </CardTitle>
          <CardDescription className="medical-annotation">
            This section will show your active and past prescriptions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" disabled className="rounded-full h-9">
            Coming soon
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
