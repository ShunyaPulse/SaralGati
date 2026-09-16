import Script from 'next/script';
import Link from 'next/link';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { Smartphone, BellRing, Brain } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-blue-50 via-white to-green-50 py-20 lg:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-4">
              Empowering Elders, <span className="text-[#0074c8]">Supporting Families</span>
            </h1>
            <h2 className="text-2xl md:text-3xl font-medium text-[#22c55e] mb-6 font-[family-name:var(--font-noto-devanagari)]">
              बुजुर्गों को सशक्त बनाना, परिवारों को सहारा
            </h2>
            <p className="mt-4 max-w-2xl text-xl text-gray-600 mx-auto mb-10">
              SaralGati makes smartphones easy for the elderly and gives families peace of mind. An AI companion that guides, learns, and protects.
            </p>
            <div className="flex justify-center space-x-4">
              <Link href="/register" className="gradient-brand text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition transform hover:-translate-y-1">
                Get Started
              </Link>
              <Link href="/about" className="bg-white text-[#0074c8] border-2 border-[#0074c8] px-8 py-4 rounded-xl font-bold text-lg shadow hover:bg-blue-50 transition transform hover:-translate-y-1">
                Learn More
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900">Designed with Care & Empathy</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="glass-card p-8 text-center bg-blue-50/50">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <Smartphone className="w-8 h-8 text-[#0074c8]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Assistance</h3>
                <p className="text-gray-600">AI-powered screen guidance that speaks the user's language, making any app easy to use for elders.</p>
              </div>
              <div className="glass-card p-8 text-center bg-green-50/50">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <BellRing className="w-8 h-8 text-[#22c55e]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Real-time Alerts</h3>
                <p className="text-gray-600">Instant notifications to family members when help is needed, ensuring round-the-clock safety.</p>
              </div>
              <div className="glass-card p-8 text-center bg-amber-50/50">
                <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                  <Brain className="w-8 h-8 text-[#f59e0b]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Habit Learning</h3>
                <p className="text-gray-600">Adapts to the elder's daily routines and proactively assists them when patterns deviate.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-[#0074c8] text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Register & Add Profile</h3>
                <p className="text-gray-600">Create an account and set up a personalized profile for your elderly family member.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-[#0074c8] text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Install Companion App</h3>
                <p className="text-gray-600">Download the SaralGati companion app on their smartphone for seamless guidance.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-[#0074c8] text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Monitor & Assist</h3>
                <p className="text-gray-600">Stay connected from anywhere. Get alerts and monitor well-being through your dashboard.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-20 gradient-brand text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-10">Built for Indian Families</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <div className="text-4xl font-extrabold mb-2">10M+</div>
                <div className="text-blue-100 font-medium">Elders Needing Care</div>
              </div>
              <div>
                <div className="text-4xl font-extrabold mb-2">12+</div>
                <div className="text-blue-100 font-medium">Languages Supported</div>
              </div>
              <div>
                <div className="text-4xl font-extrabold mb-2">24/7</div>
                <div className="text-blue-100 font-medium">Continuous Monitoring</div>
              </div>
              <div>
                <div className="text-4xl font-extrabold mb-2">100%</div>
                <div className="text-blue-100 font-medium">On-Device Privacy</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />

      {process.env.NEXT_PUBLIC_ADSTERRA_SRC && (
        <Script
          strategy="lazyOnload"
          src={process.env.NEXT_PUBLIC_ADSTERRA_SRC}
        />
      )}
    </div>
  );
}
