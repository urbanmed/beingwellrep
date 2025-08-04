import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ReportTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const reportTypes = [
  { value: 'blood_test', label: 'Blood Test' },
  { value: 'imaging', label: 'Imaging (X-ray, MRI, CT)' },
  { value: 'cardiology', label: 'Cardiology Report' },
  { value: 'pathology', label: 'Pathology Report' },
  { value: 'consultation', label: 'Consultation Notes' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'vaccination', label: 'Vaccination Record' },
  { value: 'discharge', label: 'Discharge Summary' },
  { value: 'allergy_test', label: 'Allergy Test' },
  { value: 'mental_health', label: 'Mental Health Report' },
  { value: 'other', label: 'Other' }
];

export function ReportTypeSelector({ value, onChange, disabled = false }: ReportTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="report-type">Report Type *</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id="report-type">
          <SelectValue placeholder="Select report type" />
        </SelectTrigger>
        <SelectContent>
          {reportTypes.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}