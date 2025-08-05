import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DocumentViewer } from "@/components/reports/DocumentViewer";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Report {
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
}

export default function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      if (!id) {
        console.error('No report ID provided');
        navigate('/reports');
        return;
      }

      try {
        console.log('Fetching report with ID:', id);
        
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        console.log('Report data fetched:', data);
        setReport(data);
      } catch (error) {
        console.error('Error fetching report:', error);
        toast({
          title: "Error",
          description: "Failed to load report details. Please check if the report exists.",
          variant: "destructive",
        });
        navigate('/reports');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id, navigate, toast]);

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </MobileLayout>
    );
  }

  if (!report) {
    return (
      <MobileLayout>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Report not found</p>
          <Button 
            variant="outline" 
            onClick={() => navigate('/reports')}
            className="mt-4"
          >
            Back to Reports
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        
        <DocumentViewer report={report} />
      </div>
    </MobileLayout>
  );
}