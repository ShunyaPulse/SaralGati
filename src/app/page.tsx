'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  Download, Shield, Eye, Fingerprint, Smartphone,
  Mic, Brain, Bell, CheckCircle2, XCircle,
  ArrowRight, Lock, EyeOff, KeyRound, Sparkles,
  ChevronRight, Heart, Zap, Volume2
} from 'lucide-react';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';

/* ───────── animation helpers ───────── */
function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 0.8, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ───────── phone frame component ───────── */
function PhoneFrame({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`relative mx-auto ${className}`}>
      {/* phone bezel */}
      <div className="relative w-[220px] sm:w-[260px] rounded-[2.5rem] border-[6px] border-gray-900 bg-gray-900 shadow-2xl overflow-hidden">
        {/* notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-gray-900 rounded-b-2xl z-10" />
        {/* screen */}
        <div className="relative w-full aspect-[9/19.5] bg-white overflow-hidden rounded-[2rem]">
          <Image src={src} alt={alt} fill className="object-cover object-top" sizes="260px" />
        </div>
      </div>
      {/* reflection glow */}
      <div className="absolute -inset-4 bg-gradient-to-br from-emerald-400/20 to-blue-500/20 rounded-[3rem] blur-2xl -z-10" />
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*               MAIN PAGE                     */
/* ═══════════════════════════════════════════ */
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader />

      <main className="flex-grow">
        {/* ════════════ HERO ════════════ */}
        <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
          {/* bg grain */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWx0ZXI9InVybCgjYSkiIG9wYWNpdHk9Ii4wNSIvPjwvc3ZnPg==')] opacity-50" />
          {/* glow orbs */}
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px]" />
          <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-[128px]" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-32 lg:pb-36">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* copy */}
              <div className="text-center lg:text-left min-w-0">
                <FadeUp>
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-sm text-emerald-300 mb-6">
                    <Sparkles className="w-4 h-4" />
                    <span>On-device AI · No cloud dependency</span>
                  </div>
                </FadeUp>

                <FadeUp delay={0.1}>
                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
                    Make Smartphones{' '}
                    <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                      Simple
                    </span>{' '}
                    for Your Parents.
                  </h1>
                </FadeUp>

                <FadeUp delay={0.2}>
                  <p className="text-lg sm:text-xl text-slate-300 leading-relaxed max-w-xl mx-auto lg:mx-0 mb-4">
                    A patient, on-device AI companion that speaks in Hindi, guides with visual spotlights, and brings them back when they get lost.
                  </p>
                  <p className="text-base text-slate-400 max-w-xl mx-auto lg:mx-0 mb-8">
                    No confusion. No panic. No missed video calls.
                  </p>
                </FadeUp>

                <FadeUp delay={0.3}>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <a
                      href="/api/download"
                      className="group inline-flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 rounded-2xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/30 transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <Download className="w-5 h-5 shrink-0" />
                      <span>Download for Android</span>
                      <ArrowRight className="w-4 h-4 shrink-0 group-hover:translate-x-1 transition-transform" />
                    </a>
                    <Link
                      href="/register"
                      className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white/20 text-white font-semibold text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 rounded-2xl transition-all duration-300"
                    >
                      <span>Caregiver Dashboard</span>
                      <ChevronRight className="w-4 h-4 shrink-0" />
                    </Link>
                  </div>
                  <p className="text-sm text-slate-500 mt-4 text-center lg:text-left">
                    Free forever · No ads · No data collection
                  </p>
                </FadeUp>
              </div>

              {/* Phone Showcase */}
              <FadeIn delay={0.4} className="relative w-full mt-8 lg:mt-0 min-w-0">
                {/* Desktop: Overlapping stack */}
                <div className="hidden lg:flex relative items-center justify-center">
                  <div className="absolute -left-12 top-8 -rotate-6 opacity-70 scale-90">
                    <PhoneFrame src="/images/screenshot-youtube.jpg" alt="YouTube Music screen with SaralGati search highlight" />
                  </div>
                  <div className="relative z-10">
                    <PhoneFrame src="/images/screenshot-phonepe.jpg" alt="PhonePe screen with SaralGati accessibility overlay showing Hindi guidance buttons" />
                  </div>
                  <div className="absolute -right-12 top-8 rotate-6 opacity-70 scale-90">
                    <PhoneFrame src="/images/screenshot-contacts.jpg" alt="Contacts screen with SaralGati visual highlight on missed call" />
                  </div>
                </div>

                {/* Mobile: Horizontal scroll snap */}
                <div className="flex lg:hidden overflow-x-auto snap-x snap-mandatory gap-6 pb-8 pt-4 px-4 -mx-4 no-scrollbar">
                  <div className="snap-center shrink-0 w-[85vw] flex justify-center">
                    <PhoneFrame src="/images/screenshot-phonepe.jpg" alt="PhonePe with SaralGati overlay" />
                  </div>
                  <div className="snap-center shrink-0 w-[85vw] flex justify-center">
                    <PhoneFrame src="/images/screenshot-youtube.jpg" alt="YouTube with SaralGati overlay" />
                  </div>
                  <div className="snap-center shrink-0 w-[85vw] flex justify-center">
                    <PhoneFrame src="/images/screenshot-contacts.jpg" alt="Contacts with SaralGati overlay" />
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* ════════════ PROBLEM vs SOLUTION ════════════ */}
        <section className="py-20 lg:py-28 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  You know the <span className="text-red-500">struggle</span>.
                </h2>
                <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
                  Your parents call you for every little thing on their phone. Not because they can't learn — because phones weren't designed for them.
                </p>
              </div>
            </FadeUp>

            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
              {/* WITHOUT */}
              <FadeUp delay={0.1}>
                <div className="relative rounded-3xl bg-white border border-red-100 p-8 shadow-sm">
                  <div className="inline-flex items-center gap-2 text-red-500 font-semibold text-sm mb-6 px-3 py-1 rounded-full bg-red-50">
                    <XCircle className="w-4 h-4" /> Without SaralGati
                  </div>
                  <ul className="space-y-4">
                    {[
                      'Gets confused by unknown popups and unexpected app screens',
                      'Changes settings by mistake, breaks Wi-Fi or volume',
                      '"Mujhe kuch dikh nahi raha" — screen too small, text too confusing',
                      'Missed video calls because they can\'t find the green button',
                      'Calls you 5 times a day: "Ye kaise karu?"'
                    ].map((item, i) => (
                      <li key={i} className="flex gap-3 text-slate-600">
                        <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeUp>

              {/* WITH */}
              <FadeUp delay={0.2}>
                <div className="relative rounded-3xl bg-white border border-emerald-100 p-8 shadow-sm">
                  <div className="inline-flex items-center gap-2 text-emerald-600 font-semibold text-sm mb-6 px-3 py-1 rounded-full bg-emerald-50">
                    <CheckCircle2 className="w-4 h-4" /> With SaralGati
                  </div>
                  <ul className="space-y-4">
                    {[
                      'Visual finger pointer highlights the exact button to tap',
                      'Gentle Hindi voice: "Papa, yahan green button dabayein"',
                      'Guides them step-by-step when they get stuck on unfamiliar screens',
                      'Learns their habits — no interrogation, no setup fatigue',
                      'You get a calm notification only when they actually need help'
                    ].map((item, i) => (
                      <li key={i} className="flex gap-3 text-slate-600">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeUp>
            </div>
          </div>
        </section>

        {/* ════════════ FEATURES GRID ════════════ */}
        <section className="py-20 lg:py-28 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  Technology that feels like <span className="text-emerald-500">family</span>.
                </h2>
                <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
                  Not another "senior phone." SaralGati works on their existing phone, with their existing apps.
                </p>
              </div>
            </FadeUp>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Eye,
                  title: 'Spotlight Guidance',
                  desc: 'A live visual halo glows around exactly the right button. No guessing, no wrong taps.',
                  color: 'emerald',
                },
                {
                  icon: Volume2,
                  title: 'Patient Voice Prompts',
                  desc: 'Gentle Hindi & Hinglish audio: "Mummy, neeche scroll karein." Repeats without frustration.',
                  color: 'blue',
                },
                {
                  icon: Brain,
                  title: 'Invisible Habit Learning',
                  desc: 'Silently learns their frequent contacts, apps, and routines. Zero configuration needed.',
                  color: 'amber',
                },
                {
                  icon: Bell,
                  title: 'Caregiver Peace of Mind',
                  desc: 'Get notified remotely if they stay stuck in an ad loop or unhandled screen for too long.',
                  color: 'purple',
                },
              ].map((feature, i) => {
                const colorMap: Record<string, string> = {
                  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                  blue: 'bg-blue-50 text-blue-600 border-blue-100',
                  amber: 'bg-amber-50 text-amber-600 border-amber-100',
                  purple: 'bg-purple-50 text-purple-600 border-purple-100',
                };
                const iconBg: Record<string, string> = {
                  emerald: 'bg-emerald-100 text-emerald-600',
                  blue: 'bg-blue-100 text-blue-600',
                  amber: 'bg-amber-100 text-amber-600',
                  purple: 'bg-purple-100 text-purple-600',
                };
                return (
                  <FadeUp key={i} delay={i * 0.1}>
                    <div className={`relative rounded-2xl border p-6 h-full ${colorMap[feature.color]} hover:shadow-lg transition-shadow duration-300`}>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${iconBg[feature.color]}`}>
                        <feature.icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{feature.desc}</p>
                    </div>
                  </FadeUp>
                );
              })}
            </div>
          </div>
        </section>

        {/* ════════════ SCREENSHOTS SHOWCASE ════════════ */}
        <section className="py-20 lg:py-28 bg-slate-950 text-white overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  Works on <span className="text-emerald-400">every app</span> they use.
                </h2>
                <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
                  PhonePe, YouTube, WhatsApp, Phone Dialer — SaralGati understands every screen and guides them through.
                </p>
              </div>
            </FadeUp>

            <FadeIn delay={0.2}>
              <div className="flex items-end justify-center gap-6 sm:gap-10">
                <div className="-rotate-6 translate-y-4">
                  <PhoneFrame src="/images/screenshot-youtube.jpg" alt="YouTube Music with SaralGati search icon highlight" />
                </div>
                <div className="scale-110 z-10">
                  <PhoneFrame src="/images/screenshot-phonepe.jpg" alt="PhonePe with SaralGati Hindi guidance overlay" />
                </div>
                <div className="rotate-6 translate-y-4">
                  <PhoneFrame src="/images/screenshot-contacts.jpg" alt="Phone Contacts with SaralGati missed call highlight" />
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ════════════ 3-STEP SETUP ════════════ */}
        <section className="py-20 lg:py-28 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  Setup once. Works <span className="text-emerald-500">forever</span>.
                </h2>
                <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">
                  No accounts for them to create. No passwords to remember. Under 2 minutes.
                </p>
              </div>
            </FadeUp>

            <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
              {[
                {
                  step: '01',
                  icon: Download,
                  title: 'Install the APK',
                  desc: 'Download SaralGati on your parent\'s phone. Just one tap.',
                },
                {
                  step: '02',
                  icon: Fingerprint,
                  title: 'Grant Accessibility',
                  desc: 'Our guided 1-minute setup walks you through the single permission needed.',
                },
                {
                  step: '03',
                  icon: Heart,
                  title: 'Done. It just works.',
                  desc: 'SaralGati runs silently in the background. No maintenance. No updates to push.',
                },
              ].map((s, i) => (
                <FadeUp key={i} delay={i * 0.15}>
                  <div className="relative text-center">
                    {/* step connector line (hidden on mobile) */}
                    {i < 2 && (
                      <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-slate-200" />
                    )}
                    <div className="relative z-10 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-900 text-white mb-6 shadow-lg">
                      <s.icon className="w-8 h-8" />
                    </div>
                    <div className="text-xs font-bold text-emerald-500 tracking-widest uppercase mb-2">
                      Step {s.step}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{s.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════ PRIVACY & SECURITY ════════════ */}
        <section className="py-20 lg:py-28 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 text-emerald-400 text-sm font-semibold mb-4">
                  <Shield className="w-4 h-4" />
                  Privacy First
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  Your parents' privacy is <span className="text-emerald-500">sacred</span>.
                </h2>
                <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
                  SaralGati was built with Indian family values in mind. We will never compromise on trust.
                </p>
              </div>
            </FadeUp>

            <div className="grid sm:grid-cols-3 gap-6 lg:gap-8">
              {[
                {
                  icon: EyeOff,
                  title: 'No Screen Recordings',
                  desc: 'SaralGati never records your screen or saves personal photos and chats. Only anonymized button labels needed for live guidance are processed securely in real-time.'
                },
                {
                  icon: Lock,
                  title: 'Built-in Privacy Shield',
                  desc: 'Sensitive details like passwords, OTPs, and bank balances are automatically blocked and never shared.',
                },
                {
                  icon: KeyRound,
                  title: 'Secure Connection',
                  desc: 'Your device connects directly to your family dashboard using encrypted, private passkeys. No middlemen.',
                },
              ].map((item, i) => (
                <FadeUp key={i} delay={i * 0.1}>
                  <div className="relative rounded-2xl bg-white border border-slate-200 p-8 h-full hover:shadow-lg hover:border-emerald-200 transition-all duration-300">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center mb-5">
                      <item.icon className="w-7 h-7 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">{item.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════ FINAL CTA ════════════ */}
        <section className="relative py-20 lg:py-28 bg-slate-950 text-white overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[128px]" />
          </div>
          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <FadeUp>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-6">
                Give your parents the confidence to use their phone <span className="text-emerald-400">independently</span>.
              </h2>
              <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto">
                One install. Zero learning curve. The next time they call you, it'll be to share a funny video — not to ask for help.
              </p>
              <a
                href="/api/download"
                className="group inline-flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-lg px-10 py-5 rounded-2xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/30 transition-all duration-300 hover:-translate-y-0.5"
              >
                <Download className="w-6 h-6" />
                Download SaralGati — Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <p className="text-sm text-slate-500 mt-4">
                Android 8+ · 14 MB · No Google account required
              </p>
            </FadeUp>
          </div>
        </section>
      </main>

      {/* ════════════ STICKY MOBILE DOWNLOAD BAR ════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        <div className="bg-slate-900/95 backdrop-blur-lg border-t border-white/10 px-4 py-3">
          <a
            href="/api/download"
            className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3.5 rounded-xl shadow-lg transition-colors"
          >
            <Download className="w-5 h-5" />
            Download SaralGati for Parents — Free
          </a>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
