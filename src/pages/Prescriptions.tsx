import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill } from "lucide-react";

export default function Prescriptions() {
  useEffect(() => {
    document.title = "Prescriptions | Health Dashboard";
  }, []);

  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="medical-title-sm">Prescriptions</h1>
        <p className="text-sm text-muted-foreground">Manage and track your medications securely.</p>
      </header>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-primary" />
              Your Prescriptions
            </CardTitle>
            <CardDescription>
              This section will show your active and past prescriptions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" disabled>
              Coming soon
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
