import type { Metadata } from 'next';
import Script from 'next/script';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { FadeUp } from '@/components/ui/FadeUp';

export const metadata: Metadata = {
  title: 'About Us | SaralGati',
  description: 'Learn about our mission to make technology accessible for every elder in India.',
};

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader />
      <main className="flex-grow">
        <section className="py-20 lg:py-28 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center mb-16">
                <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                  About <span className="text-[#0074c8]">SaralGati</span>
                </h1>
              </div>
            </FadeUp>
            
            <FadeUp delay={0.1}>
              <div className="space-y-12 text-lg text-slate-600 bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-100">
                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h2>
                  <p className="leading-relaxed">
                    SaralGati was born out of a universal reality in Indian homes: our parents and grandparents want to be digitally independent, but modern apps—with endless updates, confusing menus, and lurking online scams—are often overwhelming. We are building technology that empowers seniors to navigate their smartphones with absolute confidence and self-reliance, while giving families complete peace of mind.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">How SaralGati Works</h2>
                  <p className="leading-relaxed mb-6">
                    Unlike conventional remote-control or invasive surveillance tools, SaralGati is designed as a respectful, intelligent on-device companion:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-6 not-prose">
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                      <h3 className="font-bold text-slate-900 mb-2 text-base">Dynamic Visual Spotlights</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        Instead of trying to explain where a button is over a phone call, SaralGati dims the screen and highlights the exact button with an animated halo right when they get stuck.
                      </p>
                    </div>
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                      <h3 className="font-bold text-slate-900 mb-2 text-base">Patience Voice Guidance</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        Speaks calm, clear Hindi and regional instructions. It explains steps simply, never gets frustrated, and repeats as many times as needed.
                      </p>
                    </div>
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                      <h3 className="font-bold text-slate-900 mb-2 text-base">Proactive Scam Shield</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        Actively alerts and intercepts suspicious payment requests, deceptive lottery notifications, and dangerous app installations before any harm is done.
                      </p>
                    </div>
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                      <h3 className="font-bold text-slate-900 mb-2 text-base">Zero-Friction Elder Setup</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        No logins, passwords, or emails for elders to remember. One tap install, simple pairing with the caregiver, and it runs silently in the background.
                      </p>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Core Pillars</h2>
                  <ul className="list-disc pl-6 space-y-3">
                    <li><strong className="text-slate-900">Dignity, Not Surveillance:</strong> We believe in enabling independence. We do not stream screens or snoop on conversations—all assistive AI runs strictly on the elder's smartphone.</li>
                    <li><strong className="text-slate-900">Zero Cloud Dependency for Core Guidance:</strong> Navigation and spotlight prompts execute locally without lag or privacy leakage.</li>
                    <li><strong className="text-slate-900">Bridging the Generational Gap:</strong> Helping families spend phone calls sharing love and stories rather than troubleshooting tech issues.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">The Team Behind SaralGati</h2>
                  <p className="leading-relaxed">
                    We are engineers, researchers, and devoted children building the solution we needed for our own families. Operating out of Bengaluru, we are committed to making India's digital revolution truly inclusive for every senior citizen.
                  </p>
                </section>
              </div>
            </FadeUp>
          </div>
        </section>
      </main>
      <PublicFooter />
      {process.env.NEXT_PUBLIC_ADSTERRA_SRC && (
        <Script strategy="lazyOnload" src={process.env.NEXT_PUBLIC_ADSTERRA_SRC} />
      )}
    </div>
  );
}
