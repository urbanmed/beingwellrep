import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

export default function Cards() {
  useEffect(() => {
    document.title = "My Cards | Health Dashboard";
  }, []);

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-2">
        <h1 className="medical-heading-sm">My Cards</h1>
        <p className="medical-annotation text-muted-foreground">Store and access your insurance and ID cards.</p>
      </div>

      <Card className="medical-card-shadow">
        <CardHeader>
          <CardTitle className="medical-subheading flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Saved Cards
          </CardTitle>
          <CardDescription className="medical-annotation">
            A secure place for your health insurance and ID cards.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="medical-annotation text-muted-foreground">This feature is coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
