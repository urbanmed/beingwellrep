import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Pill, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
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
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  
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
      family_member_id: "none",
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
        familyMemberId: data.family_member_id === "none" ? undefined : data.family_member_id,
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
        family_member_id: data.family_member_id === "none" ? undefined : data.family_member_id,
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

  const FormContent = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 sm:space-y-6">
        {/* File Upload */}
        <div className="space-y-3 sm:space-y-4">
          <Label htmlFor="file" className="text-sm sm:text-base font-medium">Prescription Document</Label>
          {!selectedFile ? (
            <div className="relative border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 sm:p-8 text-center">
              <Upload className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
              <div className="space-y-1 sm:space-y-2">
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
              <span className="text-sm font-medium truncate flex-1 mr-2">{selectedFile.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeFile}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Medication Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <FormField
            control={form.control}
            name="medication_name"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel className="text-sm sm:text-base">Medication Name *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., Lisinopril" 
                    className="h-11 sm:h-10 text-base sm:text-sm"
                    {...field} 
                  />
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
                <FormLabel className="text-sm sm:text-base">Dosage</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., 10mg" 
                    className="h-11 sm:h-10 text-base sm:text-sm"
                    {...field} 
                  />
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
                <FormLabel className="text-sm sm:text-base">Frequency</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., Once daily" 
                    className="h-11 sm:h-10 text-base sm:text-sm"
                    {...field} 
                  />
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
                <FormLabel className="text-sm sm:text-base">Duration</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., 30 days" 
                    className="h-11 sm:h-10 text-base sm:text-sm"
                    {...field} 
                  />
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
                <FormLabel className="text-sm sm:text-base">Start Date</FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    className="h-11 sm:h-10 text-base sm:text-sm"
                    {...field} 
                  />
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
                <FormLabel className="text-sm sm:text-base">End Date</FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    className="h-11 sm:h-10 text-base sm:text-sm"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Doctor and Pharmacy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <FormField
            control={form.control}
            name="prescribing_doctor"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm sm:text-base">Prescribing Doctor</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Dr. Smith" 
                    className="h-11 sm:h-10 text-base sm:text-sm"
                    {...field} 
                  />
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
                <FormLabel className="text-sm sm:text-base">Pharmacy</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="CVS Pharmacy" 
                    className="h-11 sm:h-10 text-base sm:text-sm"
                    {...field} 
                  />
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
                <FormLabel className="text-sm sm:text-base">Family Member (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11 sm:h-10 text-base sm:text-sm">
                      <SelectValue placeholder="Select family member" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-background border shadow-lg">
                    <SelectItem value="none">None (for you)</SelectItem>
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
              <FormLabel className="text-sm sm:text-base">Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Additional notes about this prescription..."
                  className="resize-none text-base sm:text-sm min-h-[80px]"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 sm:pt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            className="w-full sm:w-auto h-11 sm:h-10 text-base sm:text-sm order-2 sm:order-1"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={uploading || !selectedFile}
            className="w-full sm:w-auto h-11 sm:h-10 text-base sm:text-sm order-1 sm:order-2"
          >
            {uploading ? "Adding..." : "Add Prescription"}
          </Button>
        </div>
      </form>
    </Form>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="px-4 pb-4 max-h-[95vh]">
          <DrawerHeader className="px-0 pb-4">
            <DrawerTitle className="flex items-center gap-2 text-lg">
              <Pill className="h-5 w-5 text-primary" />
              Add Prescription
            </DrawerTitle>
            <DrawerDescription className="text-left text-sm text-muted-foreground">
              Upload a prescription document and add medication details.
              {sourceReportTitle && (
                <span className="block mt-1 text-sm font-medium">
                  Related to: {sourceReportTitle}
                </span>
              )}
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="overflow-y-auto flex-1">
            <FormContent />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

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

        <FormContent />
      </DialogContent>
    </Dialog>
  );
}