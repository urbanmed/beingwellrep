import { Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const DocumentProcessing = lazy(() => import('./DocumentProcessing').then(module => ({ default: module.DocumentProcessing })));

export function LazyDocumentProcessing() {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    }>
      <DocumentProcessing />
    </Suspense>
  );
}