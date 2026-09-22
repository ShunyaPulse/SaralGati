import type { Metadata } from "next";
import Script from "next/script";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { FadeUp } from "@/components/ui/FadeUp";

export const metadata: Metadata = {
  title: "About Us | SaralGati (सरल गति)",
  description:
    "Empowering Indian elders with autonomous AI-guided smartphone navigation and 1-tap phone healing, while giving caregivers peace of mind.",
};

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 lg:py-24 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeUp>
              <div className="text-center">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-6">
                  🌸 Bridging the Digital Divide for Seniors
                </span>
                <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                  About <span className="text-[#0074c8]">SaralGati</span> (सरल
                  गति)
                </h1>
                <p className="mt-5 text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                  Technology should adapt to our parents, not the other way
                  around. Empowering India&apos;s senior citizens to navigate
                  smartphones fearlessly and independently.
                </p>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            {/* 70% Content: The Human Mission & Real Problems */}
            <FadeUp delay={0.1}>
              <div className="space-y-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Why We Built SaralGati
                </h2>
                <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4 text-base sm:text-lg">
                  <p>
                    In millions of Indian homes, our parents and grandparents
                    hold powerful smartphones with hesitation. Everyday apps
                    like WhatsApp, PhonePe, and YouTube frequently change
                    layouts, present confusing English tech terms, or trigger
                    accidental settings misconfigurations (accidental mute, dim
                    screens, or rapid screen timeouts).
                  </p>
                  <p>
                    Elders often feel anxious about clicking the wrong button,
                    getting trapped in unfamiliar menus, or bothering their busy
                    children repeatedly for simple tasks.
                  </p>
                  <p>
                    <strong>
                      SaralGati (&ldquo;सरल गति&rdquo; &ndash; Effortless
                      Motion)
                    </strong>{" "}
                    was designed to replace anxiety with dignity. Instead of
                    dumbing down the phone or forcing elders into clumsy senior
                    launchers, SaralGati acts as a patient, gentle companion
                    that overlays directly on top of everyday apps.
                  </p>
                </div>
              </div>
            </FadeUp>

            {/* Core Elder & Caregiver Capabilities */}
            <FadeUp delay={0.2}>
              <div className="space-y-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  How SaralGati Transforms Everyday Smartphone Use
                </h2>
                <div className="grid sm:grid-cols-2 gap-6 not-prose">
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-100 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg mb-4">
                      🎯
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2 text-lg">
                      Visual Spotlight Ring
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Whenever an elder asks a question, the rest of the screen
                      softly dims and a bright, glowing spotlight ring
                      illuminates the exact button to press next.
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-100 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg mb-4">
                      🗣️
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2 text-lg">
                      Patient Spoken Hindi Guidance
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Clear, soothing audio instructions in natural Hindi and
                      Hinglish. No jargon &mdash; just simple instructions like{" "}
                      <em>
                        &ldquo;Suresh beta ko message bhejne ke liye niche chat
                        par tap karein&rdquo;
                      </em>
                      .
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-amber-100 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg mb-4">
                      🩺
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2 text-lg">
                      &ldquo;Sab Theek Karo&rdquo; 1-Tap Healing
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      A single magic button for elders to instantly fix phone
                      glitches: restores ringtone to maximum, boosts screen
                      brightness to 85%, extends screen timeout to 5 minutes,
                      and turns off Do Not Disturb silently.
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-purple-100 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg mb-4">
                      👨‍👩‍👧
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2 text-lg">
                      Caregiver Web Dashboard
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Children can pair their parent&apos;s phone in seconds via
                      QR code, check real-time battery and service heartbeat,
                      customize 1-tap healing options, and stay reassured from
                      anywhere in the world.
                    </p>
                  </div>
                </div>
              </div>
            </FadeUp>

            {/* Privacy By Design */}
            <FadeUp delay={0.25}>
              <div className="p-8 rounded-3xl bg-blue-50/60 border border-blue-100 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🛡️</span>
                  <h3 className="text-xl font-bold text-slate-900">
                    Our Uncompromising Privacy Guarantee
                  </h3>
                </div>
                <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                  We believe elder assistance must never compromise personal
                  dignity or privacy. SaralGati is architected with strict
                  zero-knowledge boundaries:
                </p>
                <ul className="grid sm:grid-cols-2 gap-3 text-sm text-slate-700 pt-2">
                  <li className="flex items-center gap-2">
                    <span className="text-red-500 font-bold">✕</span> Never
                    takes screen recordings or screenshots
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-500 font-bold">✕</span> Never
                    intercepts personal chat texts or photos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-500 font-bold">✕</span> Never asks
                    elders for passwords or financial PINs
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span> Only
                    inspects accessibility button labels to target coordinates
                  </li>
                </ul>
              </div>
            </FadeUp>

            {/* 30% Content: Engineering, Architecture & Security */}
            <FadeUp delay={0.3}>
              <div className="pt-8 border-t border-slate-200 space-y-8">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0074c8]">
                    Under The Hood
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                    Technology &amp; Cloud Architecture
                  </h2>
                  <p className="text-slate-600 text-sm sm:text-base mt-2 leading-relaxed">
                    Behind SaralGati&apos;s simple elder-facing interface lies
                    an enterprise-grade distributed system combining on-device
                    Android accessibility with edge fine-tuned generative AI.
                  </p>
                </div>

                <div className="grid sm:grid-cols-3 gap-6 not-prose">
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                    <div className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 w-fit">
                      Android Native
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">
                      Kotlin &amp; Accessibility Service
                    </h3>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Custom accessibility engine reading accessibility node
                      trees, resolving clickable views, performing below-fold
                      scroll peeks, and ensuring 24/7 background survival via
                      OEM auto-start helpers.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                    <div className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 w-fit">
                      Edge AI &amp; LLM
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">
                      Cloudflare Workers AI &amp; LoRA
                    </h3>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Fine-tuned Llama 3.1 8B LoRA adapter trained specifically
                      for Hinglish elder intent grounding and fast-path rule
                      validation, delivering sub-second response times.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                    <div className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 w-fit">
                      Cloud &amp; Security
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">
                      Cloud Run, Neon &amp; Redis
                    </h3>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Full-stack Next.js 16 containerized on Google Cloud Run,
                      sub-5ms Redis global screen cache, Neon Serverless
                      PostgreSQL, and HMAC-SHA256 signed request integrity with
                      replay protection.
                    </p>
                  </div>
                </div>

                {/* Self-Learning Flywheel highlight */}
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <span>🔄</span> Autonomous Self-Learning Flywheel
                  </h4>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    SaralGati continuously improves without manual intervention.
                    By observing implicit confirmation signals (whether the
                    elder tapped the suggested spotlight button or tapped
                    another area), the system logs verified interaction pairs to
                    a Direct Preference Optimization (DPO) pipeline. Weekly
                    automated training workflows fine-tune our custom LoRA
                    weights on Kaggle GPUs and deploy updated models to
                    Cloudflare Workers AI with zero downtime.
                  </p>
                </div>
              </div>
            </FadeUp>

            {/* Creator / Organization Note */}
            <FadeUp delay={0.35}>
              <div className="p-6 rounded-2xl bg-white border border-slate-100 text-center space-y-2">
                <p className="text-slate-600 text-sm">
                  Engineered with dedication by{" "}
                  <a
                    href="https://github.com/ShunyaPulse"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-slate-900 hover:text-[#0074c8] transition-colors underline"
                  >
                    Vansh Gupta (ShunyaPulse)
                  </a>
                </p>
                <p className="text-slate-500 text-xs">
                  Lucknow, India &bull; Open-source &bull; Dedicated to Indian
                  Senior Citizens
                </p>
              </div>
            </FadeUp>
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
