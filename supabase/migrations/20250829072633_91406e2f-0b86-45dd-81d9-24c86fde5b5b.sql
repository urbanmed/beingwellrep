-- Clear existing FHIR data for fresh reprocessing test
DELETE FROM fhir_observations WHERE source_report_id = '955e12f8-b5f8-442d-af77-148de374397d';
DELETE FROM fhir_diagnostic_reports WHERE source_report_id = '955e12f8-b5f8-442d-af77-148de374397d';