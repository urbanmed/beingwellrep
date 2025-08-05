import { ReportHeader } from "./ReportHeader";
import { SimpleDocumentDisplay } from "./SimpleDocumentDisplay";
import { PatientInfoCard } from "./PatientInfoCard";
import { DoctorInfoCard } from "./DoctorInfoCard";
import { extractPatientAndFacilityData } from "@/lib/utils/report-data-extractor";

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
  // Extract patient and facility data from the extracted text
  const { patient, facility } = extractPatientAndFacilityData(report.extracted_text);

  return (
    <div className="space-y-6">
      <ReportHeader report={report} />
      
      {/* Patient and Facility Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {patient && <PatientInfoCard patient={patient} />}
        {facility && (
          <DoctorInfoCard
            facility={facility.facility}
            orderingPhysician={facility.orderingPhysician}
            collectionDate={facility.collectionDate}
            reportDate={facility.reportDate}
            address={facility.address}
            phone={facility.phone}
            email={facility.email}
          />
        )}
      </div>
      
      <SimpleDocumentDisplay report={report} />
    </div>
  );
}