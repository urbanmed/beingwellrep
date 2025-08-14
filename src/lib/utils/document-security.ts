// Medical Document Security Utilities
// Ensures secure handling of medical documents with zero tolerance for file mix-ups

import { supabase } from "@/integrations/supabase/client";

export interface DocumentError {
  type: 'NOT_FOUND' | 'ACCESS_DENIED' | 'INVALID_TYPE' | 'NETWORK_ERROR' | 'UNKNOWN';
  message: string;
  details?: string;
}

export interface DocumentValidationResult {
  isValid: boolean;
  fileExists: boolean;
  error?: DocumentError;
}

/**
 * Validates a medical document file with strict security checks
 * NEVER returns alternative files - only the exact file or error
 */
export async function validateMedicalDocument(
  fileUrl: string | null,
  expectedType?: string
): Promise<DocumentValidationResult> {
  if (!fileUrl) {
    return {
      isValid: false,
      fileExists: false,
      error: {
        type: 'NOT_FOUND',
        message: 'No file URL provided'
      }
    };
  }

  try {
    console.log('[SECURITY] Validating medical document:', fileUrl);

    // Check if file exists in storage (exact path only)
    const { data, error } = await supabase.storage
      .from('medical-documents')
      .download(fileUrl);

    if (error) {
      console.log('[SECURITY] File not found in storage:', error.message);
      
      return {
        isValid: false,
        fileExists: false,
        error: {
          type: error.message.includes('not found') ? 'NOT_FOUND' : 'ACCESS_DENIED',
          message: 'Document file not found in storage',
          details: error.message
        }
      };
    }

    if (!data) {
      return {
        isValid: false,
        fileExists: false,
        error: {
          type: 'NOT_FOUND',
          message: 'Document file is empty or corrupted'
        }
      };
    }

    // Validate file type if specified
    if (expectedType) {
      const actualType = data.type;
      const fileExtension = fileUrl.toLowerCase().split('.').pop();
      
      const isValidType = 
        actualType.includes(expectedType.toLowerCase()) ||
        (expectedType === 'pdf' && fileExtension === 'pdf') ||
        (expectedType === 'image' && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || ''));

      if (!isValidType) {
        return {
          isValid: false,
          fileExists: true,
          error: {
            type: 'INVALID_TYPE',
            message: `Expected ${expectedType} but found ${actualType}`,
            details: `File extension: ${fileExtension}`
          }
        };
      }
    }

    console.log('[SECURITY] Document validated successfully:', fileUrl);
    
    return {
      isValid: true,
      fileExists: true
    };

  } catch (error) {
    console.error('[SECURITY] Document validation error:', error);
    
    return {
      isValid: false,
      fileExists: false,
      error: {
        type: 'NETWORK_ERROR',
        message: 'Failed to access document storage',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

/**
 * Generates user-friendly error messages for document access failures
 */
export function getDocumentErrorMessage(error: DocumentError): string {
  switch (error.type) {
    case 'NOT_FOUND':
      return 'Document not available. The file was not properly uploaded or has been removed from storage.';
    case 'ACCESS_DENIED':
      return 'Unable to access document. Please check your permissions or try again later.';
    case 'INVALID_TYPE':
      return 'Document format is not supported or file appears to be corrupted.';
    case 'NETWORK_ERROR':
      return 'Network error while accessing document. Please check your connection and try again.';
    default:
      return 'An unexpected error occurred while accessing the document.';
  }
}

/**
 * Logs security events for audit purposes
 */
export function logDocumentAccess(
  fileUrl: string,
  action: 'VALIDATE' | 'VIEW' | 'DOWNLOAD',
  result: 'SUCCESS' | 'FAILURE',
  details?: string
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    fileUrl,
    action,
    result,
    details,
    userAgent: navigator.userAgent
  };

  console.log('[DOCUMENT_AUDIT]', logEntry);
  
  // In production, this would send to audit logging service
  // For now, just console log for debugging
}