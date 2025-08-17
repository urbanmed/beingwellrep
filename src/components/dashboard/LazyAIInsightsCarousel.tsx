import { Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const AIInsightsCarousel = lazy(() => import('./AIInsightsCarousel').then(module => ({ default: module.AIInsightsCarousel })));

export function LazyAIInsightsCarousel() {
  return (
    <Suspense fallback={
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    }>
      <AIInsightsCarousel />
    </Suspense>
  );
}