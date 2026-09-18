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
                    SaralGati was born out of a simple reality in Indian homes: our parents and elders want to be digitally independent, but modern apps with frequent layout changes and confusing interfaces can be overwhelming. SaralGati is designed to guide seniors step-by-step so they can use everyday apps with confidence.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">How SaralGati Works</h2>
                  <p className="leading-relaxed mb-6">
                    Instead of complex manuals or frustrating phone explanations, SaralGati acts as a patient digital assistant directly on the smartphone:
                  </p>
                  <div className="grid sm:grid-cols-2 gap-6 not-prose">
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                      <h3 className="font-bold text-slate-900 mb-2 text-base">Dynamic Visual Spotlights</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        When an elder asks for help, SaralGati dims the screen and highlights the exact button they need to press with a clear visual spotlight.
                      </p>
                    </div>
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                      <h3 className="font-bold text-slate-900 mb-2 text-base">Patience Voice Guidance</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        Speaks clear, friendly instructions in Hindi. It explains steps simply and repeats them whenever needed.
                      </p>
                    </div>
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                      <h3 className="font-bold text-slate-900 mb-2 text-base">Stuck & Confusion Detection</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        Recognizes repeated taps or confusion on the screen, automatically stepping in to offer assistance before frustration builds up.
                      </p>
                    </div>
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                      <h3 className="font-bold text-slate-900 mb-2 text-base">Zero-Friction Elder Setup</h3>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        No logins, passwords, or emails for elders to manage. One simple pairing step connects the app to the caregiver dashboard.
                      </p>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Core Pillars</h2>
                  <ul className="list-disc pl-6 space-y-3">
                    <li><strong className="text-slate-900">Dignity First:</strong> Enabling elders to use their phones independently without having to ask for help for every small action.</li>
                    <li><strong className="text-slate-900">Privacy by Design:</strong> We never record video or capture screenshots of the screen, and personal messages and photos are never accessed. Only button labels necessary for step-by-step guidance are processed.</li>
                    <li><strong className="text-slate-900">Family Peace of Mind:</strong> Keeping caregivers informed of device connectivity and alerts through a simple web dashboard.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">About the Project</h2>
                  <p className="leading-relaxed">
                    SaralGati is built with a deep commitment to making digital technology straightforward and stress-free for seniors. Operating out of Lucknow, the focus is on creating practical, respectful assistance that truly helps Indian families.
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
