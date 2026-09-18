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
                <section className="bg-emerald-50 border-l-4 border-emerald-500 p-6 rounded-r-2xl">
                  <h2 className="text-xl font-bold text-emerald-900 mb-2">Our Privacy Commitment</h2>
                  <p className="font-medium text-emerald-950 mb-2">
                    SaralGati is designed to guide and assist senior citizens with patience and care. We treat personal data with strict responsibility and transparency.
                  </p>
                  <p className="text-emerald-900 text-sm">
                    We do NOT record screens, stream video, or capture photos from your parents' phone. Only the text labels of on-screen buttons required to guide them are processed.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Use of Android Accessibility Service API</h2>
                  <p className="mb-4">
                    The SaralGati Android companion app requires the <strong>Accessibility Service API</strong>. This permission is used strictly for assistive navigation:
                  </p>
                  <ul className="list-disc pl-6 space-y-3">
                    <li><strong className="text-slate-900">Identifying On-Screen Controls:</strong> To locate buttons, input fields, and menus so the app can draw a visual spotlight on the exact button the elder needs to press.</li>
                    <li><strong className="text-slate-900">Detecting When an Elder is Stuck:</strong> To recognize repetitive tapping or confusion on a screen and trigger helpful Hindi voice guidance.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">2. What Information Leaves the Phone</h2>
                  <p className="mb-4">
                    To provide accurate step-by-step guidance, the following information is sent securely to our backend server:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong className="text-slate-900">Pruned UI Button Labels:</strong> The names and types of interactive elements on the current screen (e.g., "[BUTTON] Call", "[INPUT] Search") needed by our AI engine to identify the next step.</li>
                    <li><strong className="text-slate-900">App Package Name:</strong> The identifier of the app currently in use (e.g., WhatsApp, Phone dialer).</li>
                    <li><strong className="text-slate-900">Elder's Question & Spoken Help:</strong> The question asked or the guidance context, to generate the appropriate Hindi explanation.</li>
                    <li><strong className="text-slate-900">Device Heartbeat:</strong> Basic status indicators (battery percentage and online/offline status) sent to the caregiver dashboard.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">3. What We Never Collect or Record</h2>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>No Screen Recordings or Screenshots:</strong> We do not take video captures, screenshots, or stream the visual display.</li>
                    <li><strong>No Photos or Personal Media:</strong> Gallery photos, videos, and personal files are never accessed or collected.</li>
                    <li><strong>No Covert Eavesdropping:</strong> Microphone audio is only processed when the elder asks for voice help.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Caregiver Dashboard Scope</h2>
                  <p className="leading-relaxed">
                    The caregiver dashboard provides high-level reassurance (such as active connectivity status and battery level). Caregivers cannot view private chats, read messages, or watch the elder's screen remotely.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Data Retention & Deletion</h2>
                  <p className="leading-relaxed">
                    Interaction records are stored securely for service operation and model quality. Caregivers can delete elder profiles or their account directly from the dashboard settings, which purges associated records from our active databases.
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
