import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { validateGSTIN, getStateFromGSTIN } from '@/lib/utils/gst-calculator';

interface GstinValidatorProps {
  value: string;
  onChange: (value: string, isValid: boolean, state?: string) => void;
  required?: boolean;
  className?: string;
}

export const GstinValidator: React.FC<GstinValidatorProps> = ({
  value,
  onChange,
  required = false,
  className = ''
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [detectedState, setDetectedState] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setIsValid(false);
      setValidationMessage('');
      setDetectedState(null);
      onChange(value, false);
      return;
    }

    validateGstinValue(value);
  }, [value]);

  const validateGstinValue = async (gstin: string) => {
    setIsValidating(true);
    
    // Add a small delay to simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const valid = validateGSTIN(gstin);
      const state = getStateFromGSTIN(gstin);
      
      setIsValid(valid);
      setDetectedState(state);
      
      if (valid) {
        setValidationMessage(`Valid GSTIN from ${state ? state.charAt(0).toUpperCase() + state.slice(1) : 'Unknown'}`);
      } else if (gstin.length === 15) {
        setValidationMessage('Invalid GSTIN format or checksum');
      } else {
        setValidationMessage('GSTIN must be 15 characters long');
      }
      
      onChange(gstin, valid, state || undefined);
    } catch (error) {
      setIsValid(false);
      setValidationMessage('Error validating GSTIN');
      onChange(gstin, false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    onChange(inputValue, false); // Reset validity while typing
  };

  const getValidationIcon = () => {
    if (isValidating) {
      return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
    }
    
    if (!value) {
      return null;
    }
    
    if (isValid) {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
    
    return <AlertCircle className="w-4 h-4 text-red-500" />;
  };

  const getBadgeVariant = () => {
    if (isValid) return 'default';
    if (value && !isValid) return 'destructive';
    return 'secondary';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="gstin">
        GSTIN {required && <span className="text-red-500">*</span>}
      </Label>
      
      <div className="relative">
        <Input
          id="gstin"
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder="e.g., 29ABCDE1234F1Z5"
          maxLength={15}
          className={`pr-10 ${isValid ? 'border-green-500' : value && !isValid ? 'border-red-500' : ''}`}
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {getValidationIcon()}
        </div>
      </div>
      
      {value && (
        <div className="flex items-center justify-between">
          <Badge variant={getBadgeVariant()} className="text-xs">
            {isValidating ? 'Validating...' : validationMessage}
          </Badge>
          
          {detectedState && (
            <span className="text-xs text-muted-foreground">
              State: {detectedState.charAt(0).toUpperCase() + detectedState.slice(1)}
            </span>
          )}
        </div>
      )}
      
      <div className="text-xs text-muted-foreground">
        <p>GST Identification Number for business customers.</p>
        <p>Format: 2 digits (state) + 10 alphanumeric (PAN) + 1 digit + 1 alpha + 1 checksum</p>
      </div>
    </div>
  );
};