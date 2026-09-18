import type { Metadata } from 'next';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { FadeUp } from '@/components/ui/FadeUp';

export const metadata: Metadata = {
  title: 'Terms of Service | SaralGati',
  description: 'Terms of Service for SaralGati.',
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader />
      <main className="flex-grow">
        <section className="py-20 lg:py-28 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center mb-12">
                <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">Terms of Service</h1>
              </div>
            </FadeUp>
            
            <FadeUp delay={0.1}>
              <div className="space-y-10 text-lg text-slate-600 bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-100 leading-relaxed">
                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Acceptance of Terms</h2>
                  <p>
                    By accessing and using the SaralGati application ("Service"), you accept and agree to be bound by the terms and provision of this agreement.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Description of Service</h2>
                  <p>
                    SaralGati provides accessibility tools and companion software for elderly users, alongside a monitoring dashboard for their caregivers. The Service includes software installed on mobile devices and a web-based dashboard.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">3. User Responsibilities</h2>
                  <ul className="list-disc pl-6 space-y-3">
                    <li>Caregivers must have explicit consent from the elder (or legal authority) before installing the SaralGati companion app on the elder's device.</li>
                    <li>You are responsible for maintaining the confidentiality of your account and password.</li>
                    <li>You agree to notify us immediately of any unauthorized use of your account.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Elder Data Handling</h2>
                  <p>
                    As detailed in our Privacy Policy, you acknowledge that SaralGati relies on on-device processing to protect elder privacy. You agree not to attempt to reverse-engineer or extract raw usage data from the application.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Limitation of Liability</h2>
                  <p>
                    SaralGati is designed as an assistive tool, not a medical or emergency life-saving device. We are not liable for any damages, injury, or loss of life resulting from reliance on our alerts or guidance. Always use traditional emergency services (like 112 in India) for critical medical emergencies.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Termination</h2>
                  <p>
                    We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                  </p>
                </section>
              </div>
            </FadeUp>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
