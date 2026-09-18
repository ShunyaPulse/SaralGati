'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  Download, Eye, Brain, Shield,
  ArrowRight, Sparkles, Volume2, Fingerprint, Lock, ChevronRight, Activity, Zap, CheckCircle2
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';

/* ------------------------------------------- */
/*         LIVE INTERACTIVE PHONE DEMO         */
/* ------------------------------------------- */

function LivePhoneDemo() {
  const [step, setStep] = useState(0);

  // Auto-play the demo
  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s) => (s + 1) % 4);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative mx-auto w-[280px] sm:w-[320px] rounded-[3rem] border-[12px] border-zinc-900 bg-white shadow-2xl overflow-hidden shadow-emerald-500/20 transition-shadow hover:shadow-emerald-500/40">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-zinc-900 rounded-b-3xl z-50 flex items-center justify-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
        <div className="w-2 h-2 rounded-full bg-blue-900/50" />
      </div>

      {/* Screen Container */}
      <div className="relative w-full aspect-[9/19.5] bg-slate-50 flex flex-col font-sans overflow-hidden">
        
        {/* Fake PhonePe UI Header */}
        <div className="bg-[#6739B7] text-white pt-10 pb-4 px-4 shadow-md z-10">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">M</div>
              <span className="font-semibold text-lg">Send Money</span>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-md bg-white/20" />
              <div className="w-6 h-6 rounded-md bg-white/20" />
            </div>
          </div>
        </div>

        {/* Fake UI Content */}
        <div className="flex-1 p-4 flex flex-col gap-4 relative">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex gap-4 items-center">
            <div className="w-12 h-12 rounded-full bg-slate-200" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 rounded w-1/2" />
              <div className="h-3 bg-slate-100 rounded w-3/4" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">?</div>
                <div className="h-2 bg-slate-200 rounded w-full" />
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mt-4">
            <div className="h-24 bg-gradient-to-r from-purple-500 to-indigo-500" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          </div>

          {/* THE MAGIC: SaralGati Overlay */}
          <AnimatePresence>
            {(step === 1 || step === 2) && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 pointer-events-none overflow-hidden"
              >
                {/* Dimming background with a transparent hole for the button */}
                <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
                
                {/* The highlighted target */}
                <motion.div 
                  initial={{ scale: 2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className="absolute top-[3.7rem] left-[1rem] w-[3.5rem] h-[3.5rem] bg-transparent border-4 border-emerald-400 rounded-full shadow-[0_0_20px_rgba(52,211,153,0.8)] z-50 flex items-center justify-center"
                >
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }} 
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 rounded-full border-2 border-emerald-300 opacity-50"
                  />
                </motion.div>

                {/* The Voice Prompt */}
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="absolute bottom-8 left-4 right-4 bg-zinc-900 rounded-2xl p-4 shadow-2xl border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse shrink-0">
                      <Volume2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">SaralGati Voice</p>
                      <p className="text-white text-sm font-medium">"Papa, yahan goal ghere par dabayein."</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success State */}
          <AnimatePresence>
            {step === 3 && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
              >
                <div className="text-center">
                  <motion.div 
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
                    className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-white">Done!</h3>
                  <p className="text-emerald-400 text-sm mt-2">Zero Confusion.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------- */
/*               MAIN PAGE                     */
/* ------------------------------------------- */
export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans overflow-hidden">
      <PublicHeader />

      <main className="flex-grow pb-20 lg:pb-0">
        {/* ------------ HERO SECTION (PURE MAGIC) ------------ */}
        <section className="relative min-h-[90vh] flex items-center justify-center pt-20 pb-32 overflow-hidden bg-slate-950">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-emerald-500/10 blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-cyan-500/10 blur-[100px]" />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-8">
              
              {/* Hero Copy (No gradients on text to avoid Chrome bugs) */}
              <div className="flex-1 text-center lg:text-left">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm text-emerald-300 font-medium tracking-wide uppercase mb-8"
                >
                  <Zap className="w-4 h-4 text-emerald-400" /> Watch The Live Demo
                </motion.div>
                
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.05] mb-8 text-white"
                >
                  Technology that <br/> <span className="text-emerald-400">actually</span> cares.
                </motion.h1>
                
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-lg sm:text-2xl text-slate-400 max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed font-light"
                >
                  Experience the magic of SaralGati. Watch how it turns confusing apps into simple, guided steps for your parents. 
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="flex flex-col sm:flex-row items-center gap-5 justify-center lg:justify-start"
                >
                  <a
                    href="/downloads/saralgati.apk"
                    className="flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-lg transition-transform hover:-translate-y-1"
                  >
                    <Download className="w-6 h-6" /> Download App (Free)
                  </a>
                  <Link
                    href="/register"
                    className="flex items-center justify-center gap-2 text-white font-medium text-lg px-8 py-4 rounded-2xl border border-white/20 hover:bg-white/10 transition-colors"
                  >
                    Caregiver Portal <ChevronRight className="w-5 h-5" />
                  </Link>
                </motion.div>
              </div>

              {/* LIVE DEMO COMPONENT */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, type: 'spring' }}
                className="flex-1 flex justify-center lg:justify-end"
              >
                <div className="relative">
                  <div className="absolute -inset-10 bg-emerald-500/20 rounded-full blur-[80px] z-0 animate-pulse" />
                  <div className="relative z-10">
                    <LivePhoneDemo />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ------------ CLEAR, CLEAN FEATURES (LIGHT MODE) ------------ */}
        <section className="py-24 bg-white relative z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-slate-900">
                It just <span className="text-emerald-500">works</span>.
              </h2>
              <p className="text-xl text-slate-500">No tutorials. No setup for them. Just peace of mind.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Eye,
                  title: 'Visual Spotlight',
                  desc: 'Dims the screen and highlights the exact button to press. Impossible to miss.',
                  bg: 'bg-emerald-50',
                  color: 'text-emerald-600'
                },
                {
                  icon: Volume2,
                  title: 'Hindi Voice Guidance',
                  desc: 'A calm, patient voice that speaks to them in their language, guiding them step-by-step.',
                  bg: 'bg-blue-50',
                  color: 'text-blue-600'
                },
                {
                  icon: Shield,
                  title: 'Scam Shield',
                  desc: 'Auto-blocks dangerous links and popups before they can accidentally click them.',
                  bg: 'bg-purple-50',
                  color: 'text-purple-600'
                }
              ].map((f, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50 hover:-translate-y-2 transition-transform duration-300"
                >
                  <div className={`w-14 h-14 rounded-2xl ${f.bg} flex items-center justify-center mb-6`}>
                    <f.icon className={`w-7 h-7 ${f.color}`} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">{f.title}</h3>
                  <p className="text-slate-600 text-lg leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------ FINAL CALL TO ACTION ------------ */}
        <section className="py-24 bg-emerald-500 text-white text-center">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h2 className="text-4xl sm:text-6xl font-black mb-6">Stop the frustration.</h2>
            <p className="text-xl text-emerald-100 mb-10">
              Download SaralGati for your parents today. It takes 2 minutes to set up, and it's completely free.
            </p>
            <a
              href="/downloads/saralgati.apk"
              className="inline-flex items-center justify-center gap-3 bg-white text-emerald-600 font-bold text-xl px-12 py-5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-transform"
            >
              <Download className="w-6 h-6" /> Install Now
            </a>
          </div>
        </section>
      </main>

      {/* Sticky Mobile Download Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        <div className="bg-white border-t border-slate-200 px-4 py-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
          <a
            href="/downloads/saralgati.apk"
            className="flex items-center justify-center gap-2 w-full bg-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-colors active:scale-95"
          >
            <Download className="w-5 h-5" />
            Download App
          </a>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
