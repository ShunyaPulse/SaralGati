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
                    By downloading the SaralGati companion application or creating an account on the Caregiver Dashboard, you agree to comply with and be bound by these Terms of Service. If you disagree with any part of these terms, you must not use our software or services.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Description of the Service</h2>
                  <p className="mb-3">
                    SaralGati provides a digital companion designed to assist senior citizens in operating everyday smartphone apps through vocal instructions in Hindi and visual spotlight overlays. The Service consists of:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>The <strong>SaralGati Android Companion App</strong>, which utilizes Android Accessibility Services to detect UI buttons and assist the user step-by-step.</li>
                    <li>The <strong>Caregiver Web Dashboard</strong>, enabling designated family members to view connectivity status and receive alerts.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Consent & Family Relationship</h2>
                  <ul className="list-disc pl-6 space-y-3">
                    <li>You warrant that you have discussed and obtained clear, voluntary consent from your parent or elder family member prior to installing and enabling the accessibility service on their smartphone.</li>
                    <li>SaralGati must never be installed covertly or used as spyware against an individual's knowledge or will.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Device Requirements & Permissions</h2>
                  <p className="leading-relaxed mb-3">
                    To deliver real-time visual spotlights and audio guidance, the companion app requires Android 8.0 or higher and explicit activation of Android Accessibility Services. On modern Android versions (Android 13+), users must allow "Restricted Settings" under system application settings to complete sideloaded setup.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Assistive Nature & Emergency Disclaimer</h2>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-base mb-3">
                    <strong>Important Safety Notice:</strong> SaralGati is an assistive smartphone tool and is NOT a medical device, life-support monitor, or emergency response dispatch system.
                  </div>
                  <p className="leading-relaxed">
                    While SaralGati provides SOS notification features to designated family members, network delays or battery depletion may impede delivery. In the event of an urgent medical or physical emergency, users and caregivers must immediately contact local emergency services (such as dialing 112 in India).
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Third-Party App Compatibility</h2>
                  <p className="leading-relaxed">
                    SaralGati interacts with third-party Android apps (such as WhatsApp, YouTube, and phone dialers). While our guidance adapts dynamically, subsequent updates made by third-party developers to their app layouts may temporarily impact the accuracy of visual spotlights until our guidance updates.
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
