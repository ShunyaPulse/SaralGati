import Link from 'next/link';
import Image from 'next/image';

export default function PublicFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2">
            <Image src="/icon.png" alt="SaralGati Logo" width={30} height={30} className="rounded-lg" />
            <span className="text-2xl font-bold text-white tracking-wide">SaralGati</span>
          </div>
          <p className="mt-4 text-sm text-gray-400 max-w-sm">
            Empowering Elders, Supporting Families. Building accessible technology for the elderly in India to ensure they are safe, connected, and independent.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Quick Links</h3>
          <ul className="space-y-3">
            <li><Link href="/" className="hover:text-white transition">Home</Link></li>
            <li><Link href="/about" className="hover:text-white transition">About Us</Link></li>
            <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Legal</h3>
          <ul className="space-y-3">
            <li><Link href="/privacy-policy" className="hover:text-white transition">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-gray-800 text-sm text-center">
        <p>&copy; {new Date().getFullYear()} SaralGati. All rights reserved.</p>
      </div>
    </footer>
  );
}
