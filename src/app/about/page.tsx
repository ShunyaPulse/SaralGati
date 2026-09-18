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
                    Making technology accessible for every elder in India. We believe that age should not be a barrier to independence, connectivity, or safety. SaralGati bridges the digital divide for the elderly through compassionate AI and seamless family integration.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Vision</h2>
                  <p className="leading-relaxed">
                    To create a world where every senior citizen can confidently navigate the digital landscape, while their families enjoy complete peace of mind knowing their loved ones are safe and supported.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Core Values</h2>
                  <ul className="list-disc pl-6 space-y-3">
                    <li><strong className="text-slate-900">Empathy First:</strong> Every feature we build starts with understanding the struggles of our elderly users.</li>
                    <li><strong className="text-slate-900">Privacy by Design:</strong> We respect user data. All sensitive processing happens on-device.</li>
                    <li><strong className="text-slate-900">Simplicity:</strong> No jargon, no complex menus. Just intuitive, culturally-aware interfaces.</li>
                    <li><strong className="text-slate-900">Family Bond:</strong> Technology should connect families, not isolate them.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-slate-900 mb-4">The Team</h2>
                  <p className="leading-relaxed">
                    We are a dedicated group of engineers, designers, and caregivers who have firsthand experience with the challenges of elder care in modern India. SaralGati was born from our own struggles to help our parents and grandparents use smartphones safely.
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
