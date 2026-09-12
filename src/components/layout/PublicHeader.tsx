import Link from 'next/link';

export default function PublicHeader() {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-[#0074c8]">
              SaralGati
            </Link>
          </div>
          <nav className="hidden md:flex space-x-8">
            <Link href="/" className="text-gray-700 hover:text-[#0074c8] px-3 py-2 rounded-md font-medium">Home</Link>
            <Link href="/about" className="text-gray-700 hover:text-[#0074c8] px-3 py-2 rounded-md font-medium">About</Link>
            <Link href="/contact" className="text-gray-700 hover:text-[#0074c8] px-3 py-2 rounded-md font-medium">Contact</Link>
          </nav>
          <div className="flex items-center space-x-4">
            <Link href="/login" className="text-[#0074c8] hover:text-blue-800 font-medium">Login</Link>
            <Link href="/register" className="bg-[#0074c8] text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition">Get Started</Link>
          </div>
        </div>
      </div>
    </header>
  );
}
