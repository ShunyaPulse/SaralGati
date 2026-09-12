import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} SaralGati. All rights reserved.
          </p>
          <nav className="flex gap-4 text-sm text-gray-500">
            <Link href="/about" className="hover:text-gray-900 transition-colors">
              About
            </Link>
            <Link href="/privacy" className="hover:text-gray-900 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-gray-900 transition-colors">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-gray-900 transition-colors">
              Contact
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
