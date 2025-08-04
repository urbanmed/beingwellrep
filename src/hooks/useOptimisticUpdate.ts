import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useOptimisticUpdate<T>() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const execute = useCallback(async (
    optimisticUpdate: () => void,
    asyncOperation: () => Promise<T>,
    revertUpdate: () => void,
    options: OptimisticUpdateOptions<T> = {}
  ) => {
    setIsLoading(true);
    
    // Apply optimistic update immediately
    optimisticUpdate();

    try {
      const result = await asyncOperation();
      
      // Show success message
      if (options.successMessage) {
        toast({
          title: "Success",
          description: options.successMessage,
        });
      }
      
      options.onSuccess?.(result);
      return result;
    } catch (error) {
      // Revert optimistic update on failure
      revertUpdate();
      
      // Show error message
      const errorMessage = options.errorMessage || "An error occurred. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      options.onError?.(error as Error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return { execute, isLoading };
}