'use client';

import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import {
  Download, Shield, Eye, Brain, Bell, CheckCircle2,
  ArrowRight, Lock, Sparkles, ChevronRight, Volume2, Fingerprint, Activity,
  Smartphone, Zap
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════ */
/*            ADVANCED ANIMATION UTILS         */
/* ═══════════════════════════════════════════ */

// 1. Mouse Spotlight Card (Glassmorphism + Glow tracking)
function SpotlightCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const divRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current || isFocused) return;
    const div = divRef.current;
    const rect = div.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => { setIsFocused(true); setOpacity(1); };
  const handleBlur = () => { setIsFocused(false); setOpacity(0); };
  const handleMouseEnter = () => { setOpacity(1); };
  const handleMouseLeave = () => { setOpacity(0); };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(16, 185, 129, 0.15), transparent 40%)`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 pointer-events-none" />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

// 2. 3D Tilt Phone Frame
function TiltPhoneFrame({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    setRotateX(yPct * 20); // max 10 deg
    setRotateY(xPct * -20);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ rotateX, rotateY }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.5 }}
      style={{ perspective: 1200, transformStyle: 'preserve-3d' }}
      className={cn("relative mx-auto cursor-pointer", className)}
    >
      <div className="relative w-[240px] sm:w-[280px] rounded-[3rem] border-[8px] border-zinc-900 bg-black shadow-2xl overflow-hidden group">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-zinc-900 rounded-b-2xl z-10" />
        <div className="relative w-full aspect-[9/19.5] bg-zinc-950 overflow-hidden rounded-[2.2rem]">
          <Image src={src} alt={alt} fill className="object-cover object-top transition-transform duration-700 group-hover:scale-105" sizes="280px" priority />
        </div>
        {/* Screen Glare */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      </div>
      {/* Intense Background Glow */}
      <div className="absolute -inset-10 bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 rounded-full blur-3xl -z-10 opacity-50 transition-opacity duration-500 group-hover:opacity-100" />
    </motion.div>
  );
}

// 3. Staggered Text Reveal
function TextReveal({ text, className = '' }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <h1 className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, delay: i * 0.1, ease: [0.2, 0.65, 0.3, 0.9] }}
          className="inline-block mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </h1>
  );
}

// 4. Phone Frame Normal
function PhoneFrame({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <div className={cn("relative mx-auto", className)}>
      <div className="relative w-[220px] sm:w-[260px] rounded-[2.5rem] border-[6px] border-zinc-900 bg-zinc-900 shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-zinc-900 rounded-b-2xl z-10" />
        <div className="relative w-full aspect-[9/19.5] bg-zinc-950 overflow-hidden rounded-[2rem]">
          <Image src={src} alt={alt} fill className="object-cover object-top" sizes="260px" />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*               MAIN PAGE                     */
/* ═══════════════════════════════════════════ */
export default function Home() {
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.9]);

  return (
    <div className="min-h-screen flex flex-col bg-black text-zinc-50 selection:bg-emerald-500/30 font-sans overflow-hidden">
      <PublicHeader />

      <main className="flex-grow">
        {/* ════════════ HERO SECTION (CYBERPUNK / HIGH-TECH) ════════════ */}
        <section className="relative min-h-[95vh] flex items-center justify-center pt-20 pb-32 overflow-hidden">
          {/* Animated Background Mesh */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay z-0 pointer-events-none" />
          <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-600/20 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[40vw] rounded-full bg-cyan-500/10 blur-[150px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
            <motion.div 
              style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
              className="flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-8"
            >
              {/* Hero Copy */}
              <div className="flex-1 text-center lg:text-left">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-emerald-400 font-medium tracking-wide uppercase mb-8 backdrop-blur-md"
                >
                  <Sparkles className="w-4 h-4" /> The Next-Gen Companion
                </motion.div>
                
                <TextReveal 
                  text="Technology that cares. Automatically." 
                  className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.05] mb-8 bg-clip-text text-transparent bg-gradient-to-br from-white via-zinc-200 to-zinc-500"
                />
                
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-lg sm:text-2xl text-zinc-400 max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed font-light"
                >
                  We reinvented accessibility. SaralGati is an on-device AI that <strong className="text-white font-medium">sees, speaks, and guides</strong> your parents through their phone, flawlessly.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="flex flex-col sm:flex-row items-center gap-5 justify-center lg:justify-start"
                >
                  <a
                    href="/downloads/saralgati.apk"
                    className="group relative inline-flex items-center justify-center gap-3 bg-white text-black font-bold text-lg px-8 py-4 rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative z-10 flex items-center gap-2 group-hover:text-white transition-colors duration-300">
                      <Download className="w-5 h-5" /> Download App
                    </span>
                  </a>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 text-zinc-300 font-medium text-lg px-8 py-4 rounded-2xl hover:text-white hover:bg-white/5 transition-all"
                  >
                    Caregiver Portal <ChevronRight className="w-5 h-5" />
                  </Link>
                </motion.div>
              </div>

              {/* Hero 3D Interactive Phone */}
              <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: 0.2, type: 'spring' }}
                className="flex-1 flex justify-center lg:justify-end perspective-1000"
              >
                <TiltPhoneFrame src="/images/screenshot-phonepe.jpg" alt="SaralGati Interface" />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ════════════ BENTO GRID (THE ENGINE) ════════════ */}
        <section className="py-32 bg-black relative z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-20"
            >
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
                Powered by <span className="text-emerald-400">On-Device AI</span>.
              </h2>
              <p className="text-xl text-zinc-400">Zero cloud lag. Absolute privacy. Infinite patience.</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
              {/* Feature 1 (Large) */}
              <SpotlightCard className="md:col-span-2 md:row-span-2 p-10 flex flex-col justify-end group">
                <div className="absolute top-10 right-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl group-hover:bg-emerald-400/40 transition-colors duration-700" />
                <Eye className="w-12 h-12 text-emerald-400 mb-6" />
                <h3 className="text-3xl font-bold text-white mb-4">Dynamic Visual Spotlight</h3>
                <p className="text-zinc-400 text-lg max-w-md">
                  Instead of explaining where a button is, SaralGati dims the screen and draws a glowing halo around the exact button they need to press.
                </p>
              </SpotlightCard>

              {/* Feature 2 */}
              <SpotlightCard className="p-8 flex flex-col justify-end">
                <Volume2 className="w-10 h-10 text-cyan-400 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Patience Voice</h3>
                <p className="text-zinc-400 text-sm">Speaks clear Hindi instructions. Never gets tired of repeating.</p>
              </SpotlightCard>

              {/* Feature 3 */}
              <SpotlightCard className="p-8 flex flex-col justify-end">
                <Shield className="w-10 h-10 text-purple-400 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Scam Shield</h3>
                <p className="text-zinc-400 text-sm">Automatically intercepts fake payment requests and malicious popups.</p>
              </SpotlightCard>

              {/* Feature 4 (Wide) */}
              <SpotlightCard className="md:col-span-3 p-10 flex flex-col md:flex-row items-center gap-10">
                <div className="flex-1">
                  <Brain className="w-12 h-12 text-amber-400 mb-6" />
                  <h3 className="text-3xl font-bold text-white mb-4">Autonomous Habit Learning</h3>
                  <p className="text-zinc-400 text-lg">
                    It silently learns their daily routines—who they call, when they watch YouTube—and anticipates their needs before they even ask.
                  </p>
                </div>
                <div className="flex-1 w-full flex justify-center mt-6 md:mt-0">
                  <div className="relative w-full max-w-sm py-8 bg-white/5 border border-white/10 rounded-2xl overflow-hidden px-6 flex items-center justify-center">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
                        <Activity className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-32 bg-white/20 rounded-full" />
                        <div className="h-3 w-24 bg-white/10 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </div>
          </div>
        </section>

        {/* ════════════ IMMERSIVE STICKY SHOWCASE ════════════ */}
        <section className="relative bg-zinc-950 py-32 overflow-hidden border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-white">
              Works <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Everywhere</span>.
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">No special apps required. It integrates directly with the apps they already use daily.</p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-20 px-4">
            <motion.div 
              initial={{ opacity: 0, rotate: -10, y: 50 }}
              whileInView={{ opacity: 1, rotate: -5, y: 0 }}
              transition={{ duration: 0.8 }}
              className="relative z-10"
            >
              <PhoneFrame src="/images/screenshot-youtube.jpg" alt="YouTube" className="scale-90 md:scale-100" />
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 80 }}
              whileInView={{ opacity: 1, y: -20 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative z-20"
            >
              <PhoneFrame src="/images/screenshot-phonepe.jpg" alt="PhonePe" className="scale-100 md:scale-110 shadow-[0_0_100px_rgba(16,185,129,0.2)]" />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, rotate: 10, y: 50 }}
              whileInView={{ opacity: 1, rotate: 5, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative z-10 hidden md:block"
            >
              <PhoneFrame src="/images/screenshot-contacts.jpg" alt="Contacts" className="scale-90 md:scale-100" />
            </motion.div>
          </div>
        </section>

        {/* ════════════ FINAL CTA (MASSIVE) ════════════ */}
        <section className="relative py-40 bg-black overflow-hidden flex items-center justify-center text-center">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-black z-0" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none" />
          
          <div className="relative z-10 px-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-6xl sm:text-8xl md:text-9xl font-black text-white tracking-tighter mb-8">
                Ready?
              </h2>
              <p className="text-xl md:text-2xl text-zinc-400 mb-12 max-w-xl mx-auto font-light">
                Give your parents the gift of digital independence today. Completely free.
              </p>
              
              <a
                href="/downloads/saralgati.apk"
                className="group relative inline-flex items-center justify-center gap-3 bg-white text-black font-bold text-xl px-12 py-6 rounded-full overflow-hidden transition-transform hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.3)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative z-10 flex items-center gap-3 group-hover:text-white transition-colors duration-300">
                  <Download className="w-6 h-6" /> Download Now
                </span>
              </a>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Sticky Mobile Download Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        <div className="bg-black/80 backdrop-blur-xl border-t border-white/10 px-4 py-4">
          <a
            href="/downloads/saralgati.apk"
            className="flex items-center justify-center gap-2 w-full bg-white text-black font-bold py-3.5 rounded-xl shadow-lg transition-colors active:scale-95"
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
