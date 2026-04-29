'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Cloud } from 'lucide-react';

export default function ConcurrencyAnimation() {
  const [mode, setMode] = useState<'single' | 'multiple'>('single');

  const singleClients = [
    { id: 1, color: 'bg-emerald-400', shadow: 'shadow-[0_0_10px_rgba(16,185,129,0.8)]' }
  ];
  const multipleClients = [
    { id: 1, color: 'bg-emerald-400', shadow: 'shadow-[0_0_10px_rgba(16,185,129,0.8)]' },
    { id: 2, color: 'bg-blue-400', shadow: 'shadow-[0_0_10px_rgba(59,130,246,0.8)]' },
    { id: 3, color: 'bg-pink-400', shadow: 'shadow-[0_0_10px_rgba(244,114,182,0.8)]' },
    { id: 4, color: 'bg-yellow-400', shadow: 'shadow-[0_0_10px_rgba(250,204,21,0.8)]' },
  ];

  const activeClients = mode === 'single' ? singleClients : multipleClients;

  return (
    <section id="concurrency" className="min-h-screen py-20 px-6 flex flex-col items-center justify-center bg-neutral-950 relative border-t border-neutral-900">
      <div className="max-w-4xl text-center mb-12 z-10">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Fragmentación y Concurrencia (C++)</h2>
        <p className="text-neutral-400">Pasa el cursor sobre los elementos para explorar los conceptos académicos en acción.</p>
        
        <div className="mt-8 inline-flex bg-neutral-900 border border-neutral-800 rounded-full p-1 relative z-30">
          <button 
            onClick={() => setMode('single')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${mode === 'single' ? 'bg-purple-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
          >
            1 Cliente (Paralelismo Puro)
          </button>
          <button 
            onClick={() => setMode('multiple')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${mode === 'multiple' ? 'bg-purple-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
          >
            Múltiples Clientes (Concurrencia)
          </button>
        </div>
      </div>

      <div className="relative w-full max-w-5xl h-[500px] bg-neutral-900/50 border border-neutral-800 rounded-3xl p-8 flex flex-col justify-between overflow-visible">
        
        {/* Top: Incoming Requests */}
        <div className="flex justify-center space-x-12 h-16 relative group cursor-help z-20">
           <div className="absolute inset-0 -inset-y-4 z-10" />
           {activeClients.map((client, i) => (
             <motion.div 
                key={`${mode}-req-${client.id}`}
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: i * 0.2 }}
                className="flex flex-col items-center pointer-events-none"
             >
               <div className={`w-8 h-8 rounded-md ${client.color} ${client.shadow} animate-pulse`} />
               <span className="text-[10px] text-neutral-500 mt-2 font-mono">File_{client.id}</span>
             </motion.div>
           ))}
           
           <div className="absolute bottom-full mb-2 w-64 p-4 bg-neutral-800 text-sm text-neutral-300 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 text-center shadow-2xl border border-neutral-700 translate-y-2 group-hover:translate-y-0">
            <strong className="text-white block mb-2 text-base">Archivos Entrantes (Desde NestJS)</strong>
            {mode === 'single' 
              ? 'Un archivo. El Core lo divide (ej. 5MB/chunk) y usa Múltiples Hilos para procesarlo en paralelo. Calcula un Hash único por chunk.' 
              : 'Bombardeo Concurrente. El Core administra peticiones superpuestas en el tiempo, instanciando pools de hilos sin bloquear el sistema.'}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-neutral-800" />
          </div>
        </div>

        {/* Center: Thread Manager (C++) */}
        <div className="flex-1 flex items-center justify-center relative my-8">
          <div className="absolute inset-0 border-2 border-dashed border-purple-500/30 rounded-2xl pointer-events-none" />
          <div className="absolute top-4 left-4 text-xs font-mono text-purple-400/50">ThreadManager::process_file()</div>
          
          <div className="flex items-center space-x-8 z-10">
            
            {/* CPU Icon */}
            <div className="relative group cursor-help">
              <Cpu className="text-purple-400 w-16 h-16 group-hover:scale-110 transition-transform" />
              <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 w-64 p-4 bg-neutral-800 text-sm text-neutral-300 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 text-center shadow-2xl border border-neutral-700 -translate-x-2 group-hover:translate-x-0">
                <strong className="text-purple-400 block mb-2 text-base">Gestor de Hilos (C++)</strong>
                Despierta hilos usando <code className="text-pink-300">std::condition_variable</code>. En "Descarga", se encarga de reensamblar y ordenar los fragmentos que llegan desordenados para hacer streaming.
                <div className="absolute top-1/2 -left-4 -translate-y-1/2 border-8 border-transparent border-r-neutral-800" />
              </div>
            </div>

            <div className="flex flex-col space-y-3 relative group cursor-help">
              <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-80 p-4 bg-neutral-800 text-sm text-neutral-300 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 text-center shadow-2xl border border-neutral-700 translate-y-2 group-hover:translate-y-0">
                <strong className="text-pink-400 block mb-2 text-base">std::thread (Clientes HTTP Conurrentes)</strong>
                Cada hilo actúa como un cliente HTTP independiente. Usa <code className="text-pink-300">mutex.lock()</code> para sincronizar el estado interno, y realiza peticiones REST en paralelo contra la API de Supabase Storage.
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-neutral-800" />
              </div>

              {[1, 2, 3].map((thread) => (
                <div key={thread} className="flex items-center space-x-2">
                  <div className="text-[10px] font-mono text-neutral-500">std::thread_{thread}</div>
                  <div className="h-1.5 w-32 bg-neutral-800 rounded-full overflow-hidden relative">
                    {activeClients.map((client, idx) => (
                       <motion.div
                          key={`${mode}-th-${thread}-${client.id}`}
                          initial={{ left: "-20%" }}
                          animate={{ left: "120%" }}
                          transition={{ 
                            duration: 1.2, 
                            repeat: Infinity, 
                            ease: "linear",
                            delay: (idx * 0.4) + (thread * 0.1) 
                          }}
                          className={`absolute top-0 bottom-0 w-8 rounded-full ${client.color} ${client.shadow}`}
                       />
                    ))}
                  </div>
                  <div className="text-[10px] font-mono text-neutral-600 animate-pulse">mutex.lock()</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom: Storage Nodes (Cloud) */}
        <div className="flex justify-around items-end h-24 relative group cursor-help z-20">
          <div className="absolute inset-0 -inset-y-4 z-10" />

          <div className="absolute top-full mt-4 w-72 p-4 bg-neutral-800 text-sm text-neutral-300 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 text-center shadow-2xl border border-neutral-700 -translate-y-2 group-hover:translate-y-0">
            <strong className="text-cyan-400 block mb-2 text-base">Supabase Storage Buckets</strong>
            Ya no son discos físicos locales. El Core Engine envía peticiones directas en la nube estructurando los nombres (ej. <code className="text-cyan-200">/archivos/usr_1/part_001.bin</code>).
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-neutral-800" />
          </div>

          {[1, 2, 3].map((bucket) => (
            <div key={bucket} className="flex flex-col items-center relative pointer-events-none">
              {activeClients.map((client, idx) => (
                <motion.div
                  key={`${mode}-arr-${bucket}-${client.id}`}
                  initial={{ top: -80, opacity: 0 }}
                  animate={{ top: 0, opacity: [0, 1, 0] }}
                  transition={{ 
                    duration: 1, 
                    repeat: Infinity, 
                    ease: "easeIn",
                    delay: (idx * 0.3) + (bucket * 0.2)
                  }}
                  className={`absolute w-3 h-3 rounded-full ${client.color} ${client.shadow}`}
                />
              ))}
              
              <div className="w-16 h-16 bg-neutral-950 border border-cyan-500/20 rounded-xl flex items-center justify-center z-10">
                <Cloud className="text-cyan-500/80 w-8 h-8" />
              </div>
              <span className="mt-2 text-xs font-mono text-neutral-400">Bucket_Zone_{bucket}</span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
