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
                  <h2 className="text-xl font-bold text-emerald-900 mb-2">Our Fundamental Privacy Commitment</h2>
                  <p className="font-medium text-emerald-950 mb-2">
                    SaralGati is designed with a strict "Zero-Surveillance" architecture. We assist your parents by giving them visual and vocal guidance on their own phone—we never turn their phone into a surveillance camera.
                  </p>
                  <p className="text-emerald-900 text-sm">
                    All screen parsing and guidance generation occurs 100% locally on the device using on-device processing. No screen recordings, personal messages, or photos are ever sent to our servers.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Use of Android Accessibility Service API</h2>
                  <p className="mb-4">
                    The SaralGati Android companion app requires the <strong>Accessibility Service API</strong>. We use this API exclusively for the following assistive purposes:
                  </p>
                  <ul className="list-disc pl-6 space-y-3">
                    <li><strong className="text-slate-900">Identifying Interactive Elements:</strong> To detect on-screen buttons, text fields, and icons so that we can draw dynamic visual halos and spotlight the exact step to take next.</li>
                    <li><strong className="text-slate-900">Detecting Confusion & Getting Stuck:</strong> To recognize when a user is repeatedly tapping the wrong area or looping between screens, prompting gentle Hindi voice assistance.</li>
                    <li><strong className="text-slate-900">Preventing Fraud & Scams:</strong> To identify suspicious phishing prompts, fake lottery dialogs, or unauthorized APK install attempts and show immediate warning overlays.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Strict Exclusion of Sensitive Data</h2>
                  <p className="mb-4">
                    Our system is hardcoded to completely ignore and redact sensitive fields before any processing occurs:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong className="text-slate-900">Passwords & PINs:</strong> Password fields, UPI PIN keyboards, and numeric authentication prompts are automatically bypassed and masked.</li>
                    <li><strong className="text-slate-900">OTPs & Banking Credentials:</strong> SMS one-time passwords and secure banking interfaces are strictly excluded.</li>
                    <li><strong className="text-slate-900">Private Chats & Photos:</strong> We do not inspect, log, or transmit personal gallery photos, personal messages, or private media.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Data Boundaries: What Stays Local vs What Syncs</h2>
                  <div className="grid sm:grid-cols-2 gap-4 not-prose my-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <h3 className="font-bold text-slate-900 text-base mb-2">Processed 100% On-Device (Never Leaves Phone)</h3>
                      <ul className="text-sm space-y-1.5 text-slate-600 list-disc pl-4">
                        <li>Raw screen text & UI node trees</li>
                        <li>Microphone voice command recognition</li>
                        <li>Detailed app interaction logs</li>
                        <li>Personal contact names and numbers</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100">
                      <h3 className="font-bold text-[#0074c8] text-base mb-2">Synced to Caregiver Cloud</h3>
                      <ul className="text-sm space-y-1.5 text-slate-600 list-disc pl-4">
                        <li>Device heartbeat (battery level, network status)</li>
                        <li>Critical safety alerts (SOS pressed, repeated scams)</li>
                        <li>High-level habit summary (e.g., active hours)</li>
                        <li>Caregiver account credentials & paired device IDs</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Caregiver Visibility & Control</h2>
                  <p className="leading-relaxed">
                    Caregivers cannot remotely control the device screen or view what their parents are typing or watching. The Caregiver Dashboard displays only high-level reassurance indicators (e.g., "Phone active 10 mins ago", "Battery 72%", or "SOS Triggered").
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Data Deletion & Account Erasure</h2>
                  <p className="leading-relaxed">
                    You have complete ownership over your family's data. If you delete an elder profile or your caregiver account from the dashboard settings, all associated cloud records and telemetry are immediately and permanently erased from our production databases.
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
