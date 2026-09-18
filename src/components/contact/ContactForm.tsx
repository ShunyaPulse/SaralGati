'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { motion } from 'framer-motion';

export function ContactForm() {
  const [status, setStatus] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Thanks for reaching out! We will get back to you soon.');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
        <input type="text" id="name" required className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-[#0074c8] focus:ring-[#0074c8] py-3 px-4 border bg-slate-50 hover:bg-white transition-colors" />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
        <input type="email" id="email" required className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-[#0074c8] focus:ring-[#0074c8] py-3 px-4 border bg-slate-50 hover:bg-white transition-colors" />
      </div>
      <div>
        <label htmlFor="subject" className="block text-sm font-semibold text-slate-700 mb-2">Subject</label>
        <input type="text" id="subject" required className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-[#0074c8] focus:ring-[#0074c8] py-3 px-4 border bg-slate-50 hover:bg-white transition-colors" />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
        <textarea id="message" rows={5} required className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-[#0074c8] focus:ring-[#0074c8] py-3 px-4 border bg-slate-50 hover:bg-white transition-colors"></textarea>
      </div>
      <button type="submit" className="w-full inline-flex items-center justify-center gap-2 bg-[#0074c8] hover:bg-blue-700 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/25 transition-all duration-300 hover:-translate-y-0.5">
        <Send className="w-5 h-5" />
        Send Message
      </button>
      {status && (
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-emerald-600 font-semibold text-center mt-4 bg-emerald-50 py-3 rounded-lg border border-emerald-100"
        >
          {status}
        </motion.p>
      )}
    </form>
  );
}
