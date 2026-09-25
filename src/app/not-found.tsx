import Link from 'next/link';
import { ArrowLeft, LayoutDashboard, Sparkles } from 'lucide-react';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader />

      <main className="relative flex-grow overflow-hidden bg-slate-950 text-white flex items-center justify-center px-4 sm:px-6 lg:px-8 py-24">
        {/* glow orbs */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-[128px]" />

        <div className="relative max-w-xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-sm text-emerald-300 mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Page not found</span>
          </div>

          <p className="text-6xl sm:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            404
          </p>

          <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight">
            Yahan kuch nahi mila.
          </h1>
          <p className="mt-3 text-slate-400 leading-relaxed">
            The page you were looking for has moved or never existed. Let&apos;s get you back to something useful.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-3 rounded-2xl shadow-lg shadow-emerald-500/25 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-6 py-3 rounded-2xl transition-colors"
            >
              <LayoutDashboard className="w-5 h-5" />
              Caregiver Dashboard
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
