import type { Metadata } from 'next';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { FadeUp } from '@/components/ui/FadeUp';

export const metadata: Metadata = {
  title: 'Privacy Policy | SaralGati',
  description: 'Privacy Policy for SaralGati.',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader />
      <main className="flex-grow">
        <section className="py-20 lg:py-28 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center mb-12">
                <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">Privacy Policy</h1>
                <p className="text-slate-500">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </FadeUp>
            
            <FadeUp delay={0.1}>
              <div className="space-y-10 text-lg text-slate-600 bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-100 leading-relaxed">
                <section className="bg-blue-50 border-l-4 border-[#0074c8] p-6 rounded-r-2xl">
                  <h2 className="text-xl font-bold text-[#0074c8] mb-3">CRITICAL: On-Device Data Isolation</h2>
                  <p className="font-medium text-slate-800 mb-3">
                    At SaralGati, we prioritize the privacy and dignity of our elderly users above all else. 
                    We explicitly guarantee that all elder usage data—including screen interactions, visual processing, and app usage patterns—is processed locally ON the elder's device by our accessibility agent.
                  </p>
                  <p className="text-slate-800 font-medium">
                    We DO NOT send screen recordings, raw interaction logs, or personal messages to our cloud servers. Only aggregated habit patterns and critical alert events (such as SOS triggers) are synced to the cloud to notify caregivers.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Information We Collect</h2>
                  <p className="mb-3">We collect information in the following ways:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong className="text-slate-900">Caregiver Information:</strong> Name, email, phone number, and relationship to the elder.</li>
                    <li><strong className="text-slate-900">Elder Profile Information:</strong> Name, age, preferred language, and specific accessibility needs.</li>
                    <li><strong className="text-slate-900">Aggregated Telemetry:</strong> Anonymized usage statistics to improve our services.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">2. How We Use Your Information</h2>
                  <p className="mb-3">The information we collect is used solely to provide and improve the SaralGati service:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>To facilitate real-time alerts to designated caregivers.</li>
                    <li>To personalize the AI guidance based on on-device habit learning.</li>
                    <li>To provide customer support and communicate important updates.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Data Storage and Security</h2>
                  <p>
                    Cloud data is stored securely using enterprise-grade encryption. We use secure databases (PostgreSQL via Neon) and implement stringent access controls. Remember, sensitive on-screen data never leaves the elder's smartphone.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Information Sharing</h2>
                  <p>
                    We do not sell, trade, or rent your personal identification information to others. We may share generic aggregated demographic information not linked to any personal identification information with our business partners for statistical analysis.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Your Rights</h2>
                  <p>
                    You have the right to access, correct, or delete your data at any time. Caregivers can manage or delete elder profiles directly from their dashboard. Deleting a profile immediately purges the associated cloud data.
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
