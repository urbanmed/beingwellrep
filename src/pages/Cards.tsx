import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

export default function Cards() {
  useEffect(() => {
    document.title = "My Cards | Health Dashboard";
  }, []);

  return (
    <div className="p-4 space-y-4">
      <header>
        <h1 className="medical-title-sm">My Cards</h1>
        <p className="text-sm text-muted-foreground">Store and access your insurance and ID cards.</p>
      </header>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Saved Cards
            </CardTitle>
            <CardDescription>
              A secure place for your health insurance and ID cards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">This feature is coming soon.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
