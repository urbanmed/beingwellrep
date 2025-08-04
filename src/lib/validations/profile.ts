import { z } from "zod";

export const basicInfoSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  date_of_birth: z.date({
    required_error: "Date of birth is required",
  }),
  gender: z.string().min(1, "Gender is required"),
  phone_number: z.string().min(10, "Valid phone number is required"),
  address: z.string().min(5, "Full address is required"),
  preferred_language: z.string().default("english"),
});

export const medicalInfoSchema = z.object({
  insurance_provider: z.string().optional(),
  insurance_policy_number: z.string().optional(),
  physician_name: z.string().optional(),
  physician_phone: z.string().optional(),
  physician_address: z.string().optional(),
  accessibility_needs: z.array(z.string()).default([]),
});

export const emergencyContactSchema = z.object({
  emergency_contact_name: z.string().min(1, "Emergency contact name is required"),
  emergency_contact_phone: z.string().min(10, "Valid phone number is required"),
  emergency_contact_relationship: z.string().min(1, "Relationship is required"),
});

export const privacySettingsSchema = z.object({
  privacy_settings: z.object({
    share_analytics: z.boolean().default(false),
    share_with_physician: z.boolean().default(true),
  }),
  notification_preferences: z.object({
    sms: z.boolean().default(false),
    push: z.boolean().default(true),
    email: z.boolean().default(true),
  }),
});

export const completeProfileSchema = basicInfoSchema
  .merge(medicalInfoSchema)
  .merge(emergencyContactSchema)
  .merge(privacySettingsSchema);

export type BasicInfoFormData = z.infer<typeof basicInfoSchema>;
export type MedicalInfoFormData = z.infer<typeof medicalInfoSchema>;
export type EmergencyContactFormData = z.infer<typeof emergencyContactSchema>;
export type PrivacySettingsFormData = z.infer<typeof privacySettingsSchema>;
export type CompleteProfileFormData = z.infer<typeof completeProfileSchema>;