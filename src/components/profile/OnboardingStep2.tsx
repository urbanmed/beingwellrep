import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MedicalInfoFormData, medicalInfoSchema } from "@/lib/validations/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";

interface OnboardingStep2Props {
  data: Partial<MedicalInfoFormData>;
  onNext: (data: MedicalInfoFormData) => void;
  onBack: () => void;
  onChange?: (data: Partial<MedicalInfoFormData>) => void;
}

const accessibilityOptions = [
  { id: "wheelchair", label: "Wheelchair accessible facilities" },
  { id: "visual", label: "Visual impairment assistance" },
  { id: "hearing", label: "Hearing impairment assistance" },
  { id: "mobility", label: "Mobility assistance" },
  { id: "cognitive", label: "Cognitive assistance" },
  { id: "language", label: "Language interpretation services" },
];

export function OnboardingStep2({ data, onNext, onBack, onChange }: OnboardingStep2Props) {
  const form = useForm<MedicalInfoFormData>({
    resolver: zodResolver(medicalInfoSchema),
    defaultValues: {
      insurance_provider: data.insurance_provider || "",
      insurance_policy_number: data.insurance_policy_number || "",
      physician_name: data.physician_name || "",
      physician_phone: data.physician_phone || "",
      physician_address: data.physician_address || "",
      accessibility_needs: data.accessibility_needs || [],
    },
  });

  useEffect(() => {
    const subscription = form.watch((value) => {
      onChange?.(value as Partial<MedicalInfoFormData>);
    });
    return () => subscription.unsubscribe();
  }, [form, onChange]);

  const handleSubmit = (formData: MedicalInfoFormData) => {
    onNext(formData);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Medical Information</h2>
        <p className="text-muted-foreground mt-2">
          Help us serve you better by providing your medical information. All fields are optional.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Insurance Information</h3>
            
            <FormField
              control={form.control}
              name="insurance_provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Insurance Provider</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Blue Cross Blue Shield" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="insurance_policy_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Policy Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your policy number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Primary Care Physician</h3>
            
            <FormField
              control={form.control}
              name="physician_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Physician Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Dr. John Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="physician_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Physician Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="physician_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Physician Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Medical Center Dr." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Accessibility Needs</h3>
            <FormDescription>
              Select any accessibility accommodations you may need during medical visits.
            </FormDescription>
            
            <FormField
              control={form.control}
              name="accessibility_needs"
              render={() => (
                <FormItem>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {accessibilityOptions.map((option) => (
                      <FormField
                        key={option.id}
                        control={form.control}
                        name="accessibility_needs"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={option.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(option.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, option.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== option.id
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                {option.label}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              Back
            </Button>
            <Button type="submit" className="flex-1">
              Continue
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}