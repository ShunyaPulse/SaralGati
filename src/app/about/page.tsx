import Script from 'next/script';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';

export default function About() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-grow py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-8 text-center">About SaralGati</h1>
          
          <div className="space-y-12 text-lg text-gray-600">
            <section>
              <h2 className="text-2xl font-bold text-[#0074c8] mb-4">Our Mission</h2>
              <p>
                Making technology accessible for every elder in India. We believe that age should not be a barrier to independence, connectivity, or safety. SaralGati bridges the digital divide for the elderly through compassionate AI and seamless family integration.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[#0074c8] mb-4">Our Vision</h2>
              <p>
                To create a world where every senior citizen can confidently navigate the digital landscape, while their families enjoy complete peace of mind knowing their loved ones are safe and supported.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[#0074c8] mb-4">Our Core Values</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-gray-900">Empathy First:</strong> Every feature we build starts with understanding the struggles of our elderly users.</li>
                <li><strong className="text-gray-900">Privacy by Design:</strong> We respect user data. All sensitive processing happens on-device.</li>
                <li><strong className="text-gray-900">Simplicity:</strong> No jargon, no complex menus. Just intuitive, culturally-aware interfaces.</li>
                <li><strong className="text-gray-900">Family Bond:</strong> Technology should connect families, not isolate them.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-[#0074c8] mb-4">The Team</h2>
              <p>
                We are a dedicated group of engineers, designers, and caregivers who have firsthand experience with the challenges of elder care in modern India. SaralGati was born from our own struggles to help our parents and grandparents use smartphones safely.
              </p>
            </section>
          </div>
        </div>
      </main>
      <PublicFooter />
      {process.env.NEXT_PUBLIC_ADSTERRA_SRC && (
        <Script strategy="lazyOnload" src={process.env.NEXT_PUBLIC_ADSTERRA_SRC} />
      )}
    </div>
  );
}
