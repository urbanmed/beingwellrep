import { useState, memo } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  loading = 'lazy'
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div 
        className={cn("bg-muted flex items-center justify-center text-muted-foreground text-sm", className)}
        style={{ width, height }}
      >
        Image failed to load
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div 
          className={cn("absolute inset-0 bg-muted animate-pulse", className)}
          style={{ width, height }}
        />
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        onLoad={() => setIsLoading(false)}
        onError={() => setHasError(true)}
        className={cn("transition-opacity", isLoading ? "opacity-0" : "opacity-100", className)}
        decoding="async"
      />
    </div>
  );
});