'use client';
import { useState } from 'react';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { Mail, MapPin } from 'lucide-react';

export default function Contact() {
  const [status, setStatus] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Thanks for reaching out! We will get back to you soon.');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-grow py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-extrabold text-gray-900">Contact Us</h1>
            <p className="mt-4 text-xl text-gray-600">We are here to help you and your family.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Send a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                  <input type="text" id="name" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#0074c8] focus:ring-[#0074c8] py-2 px-3 border" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" id="email" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#0074c8] focus:ring-[#0074c8] py-2 px-3 border" />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Subject</label>
                  <input type="text" id="subject" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#0074c8] focus:ring-[#0074c8] py-2 px-3 border" />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message</label>
                  <textarea id="message" rows={4} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#0074c8] focus:ring-[#0074c8] py-2 px-3 border"></textarea>
                </div>
                <button type="submit" className="w-full bg-[#0074c8] text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 transition">
                  Send Message
                </button>
                {status && <p className="text-green-600 font-medium text-center">{status}</p>}
              </form>
            </div>

            {/* Contact Info & FAQ */}
            <div className="space-y-12">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in Touch</h2>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <Mail className="w-6 h-6 text-[#0074c8] mt-1 mr-4" />
                    <div>
                      <h3 className="font-medium text-gray-900">Email Support</h3>
                      <p className="text-gray-600">support@saralgati.in</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <MapPin className="w-6 h-6 text-[#0074c8] mt-1 mr-4" />
                    <div>
                      <h3 className="font-medium text-gray-900">Office</h3>
                      <p className="text-gray-600">Bengaluru, Karnataka, India</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-gray-900">Is the companion app available on iOS?</h3>
                    <p className="text-gray-600 mt-1">Currently, the companion app is only available for Android devices due to advanced accessibility requirements. The caregiver dashboard works on all devices.</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">How does the SOS feature work?</h3>
                    <p className="text-gray-600 mt-1">When triggered, it immediately sends a high-priority alert with location data to all designated family members through the dashboard and SMS.</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Does it require an internet connection?</h3>
                    <p className="text-gray-600 mt-1">Core accessibility features work offline. Alerts and dashboard syncing require an active internet connection.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
