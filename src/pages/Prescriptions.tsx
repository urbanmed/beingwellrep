import { useEffect, useState } from "react";
import { Plus, Filter, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PrescriptionCard } from "@/components/prescriptions/PrescriptionCard";
import { AddPrescriptionDialog } from "@/components/prescriptions/AddPrescriptionDialog";
import { usePrescriptions } from "@/hooks/usePrescriptions";

export default function Prescriptions() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { prescriptions, loading } = usePrescriptions();

  useEffect(() => {
    document.title = "Prescriptions | Health Dashboard";
  }, []);

  // Filter prescriptions based on search and status
  const filteredPrescriptions = prescriptions.filter((prescription) => {
    const matchesSearch = prescription.medication_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
      prescription.prescribing_doctor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.pharmacy?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || prescription.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Group prescriptions by status
  const activePrescriptions = filteredPrescriptions.filter(p => p.status === 'active');
  const completedPrescriptions = filteredPrescriptions.filter(p => p.status === 'completed');
  const discontinuedPrescriptions = filteredPrescriptions.filter(p => p.status === 'discontinued');

  const renderPrescriptionGroup = (title: string, prescriptions: any[], emptyMessage: string) => {
    if (prescriptions.length === 0) return null;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <span className="text-sm text-muted-foreground">({prescriptions.length})</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {prescriptions.map((prescription) => (
            <PrescriptionCard key={prescription.id} prescription={prescription} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="medical-heading-sm">Prescriptions</h1>
          <p className="medical-annotation text-muted-foreground">
            Manage and track your medications securely.
          </p>
        </div>
        
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Prescription
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search medications, doctors, or pharmacies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && prescriptions.length === 0 && (
        <Card className="medical-card-shadow">
          <CardHeader>
            <CardTitle className="medical-subheading flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              No Prescriptions Found
            </CardTitle>
            <CardDescription className="medical-annotation">
              You haven't added any prescriptions yet. Start by adding your first prescription.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowAddDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Your First Prescription
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Prescription Groups */}
      {!loading && prescriptions.length > 0 && (
        <div className="space-y-8">
          {filteredPrescriptions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground">
                  <p>No prescriptions match your current filters.</p>
                  <p className="text-sm mt-1">Try adjusting your search or filter criteria.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {renderPrescriptionGroup("Active Prescriptions", activePrescriptions, "No active prescriptions")}
              {renderPrescriptionGroup("Completed Prescriptions", completedPrescriptions, "No completed prescriptions")}
              {renderPrescriptionGroup("Discontinued Prescriptions", discontinuedPrescriptions, "No discontinued prescriptions")}
            </>
          )}
        </div>
      )}

      <AddPrescriptionDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
      />
    </div>
  );
}
