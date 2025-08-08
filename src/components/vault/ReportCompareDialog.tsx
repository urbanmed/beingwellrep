import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface ReportBasic {
  id: string;
  title: string;
  report_type: string;
  report_date: string;
  physician_name: string | null;
  facility_name: string | null;
  tags: string[];
  parsed_data?: any;
}

interface ReportCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reports: ReportBasic[]; // Expect 0-2
}

export function ReportCompareDialog({ open, onOpenChange, reports }: ReportCompareDialogProps) {
  const [left, right] = reports;

  const Field = ({ label, leftVal, rightVal }: { label: string; leftVal?: any; rightVal?: any }) => (
    <div className="grid grid-cols-3 gap-3 items-start py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm break-words">{leftVal ?? "-"}</div>
      <div className="text-sm break-words">{rightVal ?? "-"}</div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Compare Reports</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          <div />
          <div className="medical-subheading">{left?.title || "Select 2 documents"}</div>
          <div className="medical-subheading">{right?.title || ""}</div>
        </div>

        <div className="border rounded-md">
          <Field label="Type" leftVal={left?.report_type?.replace(/_/g, " ")} rightVal={right?.report_type?.replace(/_/g, " ")} />
          <div className="border-t" />
          <Field label="Date" leftVal={left?.report_date} rightVal={right?.report_date} />
          <div className="border-t" />
          <Field label="Physician" leftVal={left?.physician_name} rightVal={right?.physician_name} />
          <div className="border-t" />
          <Field label="Facility" leftVal={left?.facility_name} rightVal={right?.facility_name} />
          <div className="border-t" />
          <div className="grid grid-cols-3 gap-3 items-start py-2">
            <div className="text-xs text-muted-foreground">Tags</div>
            <div className="flex flex-wrap gap-1">
              {left?.tags?.map((t) => (
                <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {right?.tags?.map((t) => (
                <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <div className="medical-label mb-1">Data</div>
            <pre className="text-xs bg-muted/50 p-2 rounded max-h-56 overflow-auto">{left?.parsed_data ? JSON.stringify(left.parsed_data, null, 2) : "-"}</pre>
          </div>
          <div>
            <div className="medical-label mb-1">Data</div>
            <pre className="text-xs bg-muted/50 p-2 rounded max-h-56 overflow-auto">{right?.parsed_data ? JSON.stringify(right.parsed_data, null, 2) : "-"}</pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
