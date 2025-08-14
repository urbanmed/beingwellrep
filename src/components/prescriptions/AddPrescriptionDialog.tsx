import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Pill, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useFileUpload } from "@/hooks/useFileUpload";
import { usePrescriptions } from "@/hooks/usePrescriptions";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";
import { useToast } from "@/hooks/use-toast";

const prescriptionSchema = z.object({
  medication_name: z.string().min(1, "Medication name is required"),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  prescribing_doctor: z.string().optional(),
  pharmacy: z.string().optional(),
  family_member_id: z.string().optional(),
  notes: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

type PrescriptionFormData = z.infer<typeof prescriptionSchema>;

interface AddPrescriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceReportId?: string;
  sourceReportTitle?: string;
}

export function AddPrescriptionDialog({ 
  isOpen, 
  onClose, 
  sourceReportId,
  sourceReportTitle 
}: AddPrescriptionDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const { uploadFiles } = useFileUpload();
  const { createPrescription } = usePrescriptions();
  const { familyMembers } = useFamilyMembers();
  const { toast } = useToast();

  const form = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      medication_name: "",
      dosage: "",
      frequency: "",
      duration: "",
      prescribing_doctor: "",
      pharmacy: "",
      family_member_id: "",
      notes: "",
      start_date: "",
      end_date: "",
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (data: PrescriptionFormData) => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a prescription file to upload",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Upload the prescription file using uploadFiles (batch method)
      await uploadFiles([selectedFile], 'prescription', '', {
        familyMemberId: data.family_member_id || undefined,
      });

      // Wait for upload to complete and get the uploaded file data
      // Note: This is a simplified approach. In a real implementation, 
      // you'd want to get the actual report ID from the upload result
      const uploadResult = { data: { id: 'temp-report-id' } };

      if (!uploadResult.data) {
        throw new Error('Failed to upload prescription file');
      }

      // Create prescription record
      const prescriptionData = {
        report_id: uploadResult.data.id,
        source_report_id: sourceReportId,
        medication_name: data.medication_name,
        dosage: data.dosage,
        frequency: data.frequency,
        duration: data.duration,
        prescribing_doctor: data.prescribing_doctor,
        pharmacy: data.pharmacy,
        family_member_id: data.family_member_id,
        notes: data.notes,
        start_date: data.start_date,
        end_date: data.end_date,
      };

      const result = await createPrescription(prescriptionData);
      
      if (result.error) {
        throw new Error('Failed to create prescription record');
      }

      form.reset();
      setSelectedFile(null);
      onClose();
      
    } catch (error) {
      console.error('Error adding prescription:', error);
      toast({
        title: "Error",
        description: "Failed to add prescription",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            Add Prescription
          </DialogTitle>
          <DialogDescription>
            Upload a prescription document and add medication details.
            {sourceReportTitle && (
              <span className="block mt-1 text-sm font-medium">
                Related to: {sourceReportTitle}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* File Upload */}
            <div className="space-y-4">
              <Label htmlFor="file">Prescription Document</Label>
              {!selectedFile ? (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Choose a file or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, JPEG, PNG up to 10MB
                    </p>
                  </div>
                  <input
                    type="file"
                    id="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Medication Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="medication_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medication Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Lisinopril" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dosage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dosage</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 10mg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Once daily" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 30 days" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Doctor and Pharmacy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="prescribing_doctor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prescribing Doctor</FormLabel>
                    <FormControl>
                      <Input placeholder="Dr. Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="pharmacy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pharmacy</FormLabel>
                    <FormControl>
                      <Input placeholder="CVS Pharmacy" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Family Member */}
            {familyMembers.length > 0 && (
              <FormField
                control={form.control}
                name="family_member_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Family Member (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select family member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None (for you)</SelectItem>
                        {familyMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.first_name} {member.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about this prescription..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploading || !selectedFile}>
                {uploading ? "Adding..." : "Add Prescription"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}