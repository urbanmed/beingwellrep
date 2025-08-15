import { EnhancedDocumentViewer } from "./EnhancedDocumentViewer";

interface DocumentViewerProps {
  report: {
    id: string;
    title: string;
    type?: string;
    parsing_status: string;
    parsed_data?: any;
    confidence_score?: number;
    extracted_text?: string;
    file_url: string | null;
    physician_name?: string;
    facility_name?: string;
    report_date?: string;
    file_name?: string | null;
  };
}

export function DocumentViewer({ report }: DocumentViewerProps) {
  // Use the enhanced viewer that provides both structured data and original document views
  return <EnhancedDocumentViewer report={report} />;
}