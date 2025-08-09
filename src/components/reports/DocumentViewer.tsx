import { ReportHeader } from "./ReportHeader";
import { EnhancedDocumentViewer } from "./EnhancedDocumentViewer";
import { PatientInfoCard } from "./PatientInfoCard";
import { DoctorInfoCard } from "./DoctorInfoCard";
import { CustomStructuredDataViewer } from "./CustomStructuredDataViewer";
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
  // Check if this is a custom processed report
  const isCustomReport = report.report_type === 'custom';
  
  // Extract patient and facility data only for non-custom reports
  const patientFacility = !isCustomReport
    ? extractPatientAndFacilityData(report.extracted_text)
    : { patient: null, facility: null };
  return (
    <div className="space-y-6">
      <ReportHeader report={report} />
      
      {isCustomReport ? (
        // Use custom structured data viewer for custom reports
        <CustomStructuredDataViewer parsedData={report.parsed_data} />
      ) : (
        <>
          {/* Patient and Facility Information Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {patientFacility.patient && <PatientInfoCard patient={patientFacility.patient} />}
            {patientFacility.facility && (
              <DoctorInfoCard
                facility={patientFacility.facility.facility}
                orderingPhysician={patientFacility.facility.orderingPhysician}
                collectionDate={patientFacility.facility.collectionDate}
                reportDate={patientFacility.facility.reportDate}
                address={patientFacility.facility.address}
                phone={patientFacility.facility.phone}
                email={patientFacility.facility.email}
              />
            )}
          </div>
          
          <EnhancedDocumentViewer report={report} />
        </>
      )}
    </div>
  );
}