import React from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from './card';

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`animate-spin text-[#0074c8] ${className}`} />;
}

export function FullPageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
      <Spinner className="h-12 w-12 mb-4" />
      <h2 className="text-xl font-semibold text-gray-900">SaralGati</h2>
      <p className="text-gray-500 mt-2">Loading...</p>
    </div>
  );
}

export function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`h-4 animate-pulse rounded bg-gray-200 ${className}`} />;
}

export function SkeletonCard() {
  return (
    <Card>
      <CardHeader>
        <SkeletonLine className="h-6 w-1/3 mb-2" />
        <SkeletonLine className="w-1/2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <SkeletonLine className="w-full" />
        <SkeletonLine className="w-5/6" />
        <SkeletonLine className="w-4/6" />
      </CardContent>
    </Card>
  );
}
