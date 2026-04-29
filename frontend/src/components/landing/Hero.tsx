'use client';

import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

export default function Hero() {
  return (
    <section id="hero" className="min-h-screen flex flex-col items-center justify-center pt-16 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="z-10 text-center px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6">
            Distributed <span className="text-emerald-400">Concurrent</span> File System
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <p className="text-lg md:text-2xl text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Un motor de almacenamiento C++ diseñado para dominar la concurrencia. Sin cuellos de botella. Paralelismo puro mediante <code className="text-emerald-300 bg-emerald-950/50 px-2 py-1 rounded">std::thread</code> y <code className="text-emerald-300 bg-emerald-950/50 px-2 py-1 rounded">std::mutex</code>.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6"
        >
          <button 
            onClick={() => document.getElementById('architecture')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold px-8 py-4 rounded-full transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)] flex items-center space-x-2"
          >
            <span>Descubrir Cómo Funciona</span>
            <ArrowDown className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
