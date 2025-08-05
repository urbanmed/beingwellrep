import { ReportHeader } from "./ReportHeader";
import { SimpleDocumentDisplay } from "./SimpleDocumentDisplay";

interface DocumentViewerProps {
  report: {
    id: string;
    title: string;
    report_type: string;
    parsing_status: string;
    parsed_data: any;
    extraction_confidence: number | null;
    parsing_confidence: number | null;
    extracted_text: string | null;
    file_url: string | null;
    physician_name: string | null;
    facility_name: string | null;
    report_date: string;
  };
}

export function DocumentViewer({ report }: DocumentViewerProps) {
  return (
    <div className="space-y-6">
      <ReportHeader report={report} />
      <SimpleDocumentDisplay report={report} />
    </div>
  );
}