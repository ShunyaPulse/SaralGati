import Link from 'next/link';
import Image from 'next/image';

export default function PublicHeader() {
  return (
    <header className="bg-black/50 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-white tracking-tight">
              <Image src="/icon.png" alt="SaralGati Logo" width={32} height={32} className="rounded-lg shadow-sm" priority />
              SaralGati
            </Link>
          </div>
          <nav className="hidden md:flex space-x-8">
            <Link href="/" className="text-zinc-400 hover:text-white transition-colors px-3 py-2 rounded-md font-medium">Home</Link>
            <Link href="/about" className="text-zinc-400 hover:text-white transition-colors px-3 py-2 rounded-md font-medium">About</Link>
            <Link href="/contact" className="text-zinc-400 hover:text-white transition-colors px-3 py-2 rounded-md font-medium">Contact</Link>
          </nav>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link href="/login" className="text-zinc-300 hover:text-white font-medium text-sm sm:text-base transition-colors">Login</Link>
            <Link href="/register" className="bg-white text-black px-4 py-2 rounded-xl font-bold hover:bg-zinc-200 transition-colors text-sm sm:text-base whitespace-nowrap shadow-[0_0_15px_rgba(255,255,255,0.2)]">Get Started</Link>
          </div>
        </div>
      </div>
    </header>
  );
}
