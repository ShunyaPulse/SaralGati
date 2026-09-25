'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>

        <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          An unexpected error interrupted this page. Your data is safe — try again, or head back home.
        </p>

        {error.digest && (
          <p className="mt-3 font-mono text-xs text-slate-400">Reference: {error.digest}</p>
        )}

        <div className="mt-7 flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0074c8] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-[#0074c8] focus:ring-offset-2"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Home className="h-4 w-4" />
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
