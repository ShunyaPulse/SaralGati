import type { Metadata } from 'next';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { Mail, MapPin } from 'lucide-react';
import { FadeUp } from '@/components/ui/FadeUp';
import { ContactForm } from '@/components/contact/ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us | SaralGati',
  description: 'Contact us for any questions or support regarding SaralGati.',
};

export default function Contact() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader />
      <main className="flex-grow">
        <section className="py-20 lg:py-28 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center mb-16">
                <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">Contact Us</h1>
                <p className="mt-4 text-lg sm:text-xl text-slate-500">We are here to help you and your family.</p>
              </div>
            </FadeUp>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              {/* Contact Form */}
              <FadeUp delay={0.1}>
                <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-100">
                  <h2 className="text-2xl font-bold text-slate-900 mb-8">Send a Message</h2>
                  <ContactForm />
                </div>
              </FadeUp>

              {/* Contact Info & FAQ */}
              <FadeUp delay={0.2}>
                <div className="space-y-12 lg:pl-8">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-8">Get in Touch</h2>
                    <div className="space-y-6">
                      <div className="flex items-start bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="bg-blue-50 p-3 rounded-xl mr-5">
                          <Mail className="w-6 h-6 text-[#0074c8]" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 mb-1">Email Support</h3>
                          <p className="text-slate-500">support@saralgati.in</p>
                        </div>
                      </div>
                      <div className="flex items-start bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="bg-blue-50 p-3 rounded-xl mr-5">
                          <MapPin className="w-6 h-6 text-[#0074c8]" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 mb-1">Office</h3>
                          <p className="text-slate-500">Bengaluru, Karnataka, India</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-8">Frequently Asked Questions</h2>
                    <div className="space-y-6">
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-2">Is the companion app available on iOS?</h3>
                        <p className="text-slate-600 leading-relaxed">Currently, the companion app is only available for Android devices due to advanced accessibility requirements. The caregiver dashboard works on all devices.</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-2">How does the SOS feature work?</h3>
                        <p className="text-slate-600 leading-relaxed">When triggered, it immediately sends a high-priority alert with location data to all designated family members through the dashboard and SMS.</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-2">Does it require an internet connection?</h3>
                        <p className="text-slate-600 leading-relaxed">Core accessibility features work offline. Alerts and dashboard syncing require an active internet connection.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeUp>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
