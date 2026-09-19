'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { motion } from 'framer-motion';

export function ContactForm() {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    website: '', // honeypot
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus('');
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setStatus('Thanks for reaching out! We will get back to you soon.');
      setFormData({ name: '', email: '', subject: '', message: '', website: '' });
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input
        type="text"
        id="website"
        name="website"
        value={formData.website}
        onChange={handleChange}
        style={{ display: 'none' }}
        tabIndex={-1}
        autoComplete="off"
      />
      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
        <input type="text" id="name" value={formData.name} onChange={handleChange} required className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-[#0074c8] focus:ring-[#0074c8] py-3 px-4 border bg-slate-50 hover:bg-white transition-colors" disabled={isSubmitting} />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
        <input type="email" id="email" value={formData.email} onChange={handleChange} required className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-[#0074c8] focus:ring-[#0074c8] py-3 px-4 border bg-slate-50 hover:bg-white transition-colors" disabled={isSubmitting} />
      </div>
      <div>
        <label htmlFor="subject" className="block text-sm font-semibold text-slate-700 mb-2">Subject</label>
        <input type="text" id="subject" value={formData.subject} onChange={handleChange} required className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-[#0074c8] focus:ring-[#0074c8] py-3 px-4 border bg-slate-50 hover:bg-white transition-colors" disabled={isSubmitting} />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
        <textarea id="message" value={formData.message} onChange={handleChange} rows={5} required className="block w-full rounded-xl border-slate-200 shadow-sm focus:border-[#0074c8] focus:ring-[#0074c8] py-3 px-4 border bg-slate-50 hover:bg-white transition-colors" disabled={isSubmitting}></textarea>
      </div>
      <button type="submit" disabled={isSubmitting} className="w-full inline-flex items-center justify-center gap-2 bg-[#0074c8] hover:bg-blue-700 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/25 transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0">
        <Send className="w-5 h-5" />
        {isSubmitting ? 'Sending...' : 'Send Message'}
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
      {error && (
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-600 font-semibold text-center mt-4 bg-red-50 py-3 rounded-lg border border-red-100"
        >
          {error}
        </motion.p>
      )}
    </form>
  );
}
