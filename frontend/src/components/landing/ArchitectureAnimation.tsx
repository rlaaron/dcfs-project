'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Laptop, Server, Database, Braces, Cloud } from 'lucide-react';

type Mode = 'upload' | 'download';

export default function ArchitectureAnimation() {
  const [mode, setMode] = useState<Mode>('upload');

  const uploadParticles = [
    { id: 'u1', start: { left: '10%', top: '50%' }, end: { left: '35%', top: '50%' }, color: 'bg-blue-500', delay: 0 },
    { id: 'u2', start: { left: '35%', top: '50%' }, end: { left: '65%', top: '50%' }, color: 'bg-red-500', delay: 0.5 },
    { id: 'u3', start: { left: '65%', top: '50%' }, end: { left: '90%', top: '80%' }, color: 'bg-purple-500', delay: 1.0 },
    { id: 'u4', start: { left: '65%', top: '50%' }, end: { left: '90%', top: '80%' }, color: 'bg-purple-500', delay: 1.3 },
    { id: 'u5', start: { left: '65%', top: '50%' }, end: { left: '90%', top: '80%' }, color: 'bg-purple-500', delay: 1.6 },
    { id: 'u6', start: { left: '65%', top: '50%' }, end: { left: '90%', top: '20%' }, color: 'bg-emerald-500', delay: 2.2 },
  ];

  const downloadParticles = [
    { id: 'd1', start: { left: '10%', top: '50%' }, end: { left: '35%', top: '50%' }, color: 'bg-blue-500', delay: 0 },
    { id: 'd2', start: { left: '35%', top: '50%' }, end: { left: '90%', top: '20%' }, color: 'bg-emerald-500', delay: 0.5 },
    { id: 'd3', start: { left: '90%', top: '20%' }, end: { left: '35%', top: '50%' }, color: 'bg-emerald-500', delay: 1.0 },
    { id: 'd4', start: { left: '35%', top: '50%' }, end: { left: '65%', top: '50%' }, color: 'bg-red-500', delay: 1.5 },
    { id: 'd5', start: { left: '65%', top: '50%' }, end: { left: '90%', top: '80%' }, color: 'bg-purple-500', delay: 2.0 },
    { id: 'd6', start: { left: '90%', top: '80%' }, end: { left: '65%', top: '50%' }, color: 'bg-cyan-400', delay: 2.5 },
    { id: 'd7', start: { left: '90%', top: '80%' }, end: { left: '65%', top: '50%' }, color: 'bg-cyan-400', delay: 2.8 },
    { id: 'd8', start: { left: '90%', top: '80%' }, end: { left: '65%', top: '50%' }, color: 'bg-cyan-400', delay: 3.1 },
    { id: 'd9', start: { left: '65%', top: '50%' }, end: { left: '35%', top: '50%' }, color: 'bg-purple-500', delay: 3.8 },
    { id: 'd10', start: { left: '35%', top: '50%' }, end: { left: '10%', top: '50%' }, color: 'bg-blue-500', delay: 4.3 },
  ];

  const activeParticles = mode === 'upload' ? uploadParticles : downloadParticles;
  const loopDuration = mode === 'upload' ? 3.5 : 5.5;

  const tooltips = {
    client: {
      upload: "El usuario sube un archivo grande. El cliente no lo manda a la DB, sino que abre un stream directo hacia el API Gateway.",
      download: "El usuario solicita la descarga. El navegador recibe un Stream continuo de datos que le permite iniciar la descarga casi instantáneamente.",
    },
    gateway: {
      upload: "Recibe el flujo del Cliente y lo redirige inmediatamente al Core Engine. No guarda nada en memoria local para evitar colapsos por alta concurrencia.",
      download: "Consulta en Postgres el mapa del archivo. Pasa esa lista de rutas al Core y luego retransmite de vuelta el stream ensamblado al Cliente.",
    },
    core: {
      upload: "Fragmenta el archivo (ej. 5MB), calcula un Hash único para evitar corrupción y carga cada fragmento usando la API de Supabase Storage. Al final, registra el mapa en Postgres.",
      download: "Descarga Multihilo: Obtiene varios fragmentos a la vez desde el Storage, los ordena y hace streaming de vuelta al Gateway sin esperar a tener el 100% del archivo.",
    },
    db: {
      upload: "La Fuente de Verdad. Registra el 'Mapa del Archivo' una vez que el Core confirma que todos los fragmentos están seguros en el Storage.",
      download: "Responde al Gateway con la lista ordenada de URLs o rutas que conforman el archivo solicitado.",
    },
    storage: {
      upload: "Carga Directa. Recibe los fragmentos y los guarda con rutas estructuradas (ej. archivos/usr_1/part_001.bin) actuando como el sistema de archivos distribuido real.",
      download: "Entrega los fragmentos binarios en paralelo a los hilos trabajadores (std::thread) del Core Engine cuando son solicitados.",
    }
  };

  return (
    <section id="architecture" className="min-h-screen py-20 px-6 flex flex-col items-center justify-center bg-neutral-950 relative border-t border-neutral-900">
      <div className="max-w-4xl text-center mb-6 z-20">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Arquitectura del Sistema</h2>
        <p className="text-neutral-400">Pasa el cursor sobre los componentes para entender su función exacta en cada flujo.</p>
        
        <div className="mt-8 inline-flex bg-neutral-900 border border-neutral-800 rounded-full p-1">
          <button 
            onClick={() => setMode('upload')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${mode === 'upload' ? 'bg-emerald-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
          >
            Flujo de Subida (Ingesta)
          </button>
          <button 
            onClick={() => setMode('download')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${mode === 'download' ? 'bg-blue-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
          >
            Flujo de Descarga (Streaming)
          </button>
        </div>
      </div>

      <div className="relative w-full max-w-5xl h-[500px] mt-10 z-10">
        
        {/* Background SVG Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <line x1="10%" y1="50%" x2="35%" y2="50%" stroke="#262626" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="35%" y1="50%" x2="65%" y2="50%" stroke="#262626" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="35%" y1="50%" x2="90%" y2="20%" stroke="#262626" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="65%" y1="50%" x2="90%" y2="20%" stroke="#262626" strokeWidth="2" strokeDasharray="4 4" />
          <line x1="65%" y1="50%" x2="90%" y2="80%" stroke="#262626" strokeWidth="2" strokeDasharray="4 4" />
        </svg>

        {/* Particles */}
        <AnimatePresence mode="popLayout">
          {activeParticles.map((particle) => (
            <motion.div
              key={`${mode}-${particle.id}`}
              initial={{ left: particle.start.left, top: particle.start.top, opacity: 0 }}
              animate={{ 
                left: [particle.start.left, particle.end.left], 
                top: [particle.start.top, particle.end.top],
                opacity: [0, 1, 1, 0] 
              }}
              transition={{ 
                duration: 1.5, 
                delay: particle.delay, 
                repeat: Infinity, 
                repeatDelay: loopDuration - 1.5,
                ease: "linear" 
              }}
              className={`absolute w-3 h-3 rounded-full ${particle.color} shadow-[0_0_10px_rgba(255,255,255,0.5)] -ml-1.5 -mt-1.5 z-10`}
            />
          ))}
        </AnimatePresence>

        {/* Nodes */}
        {/* Node 1: Cliente */}
        <div className="absolute top-1/2 left-[10%] -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center cursor-help z-20">
          <div className="w-20 h-20 bg-neutral-900 border border-neutral-700 rounded-2xl flex items-center justify-center shadow-lg group-hover:border-blue-500 transition-colors">
            <Laptop className="text-blue-400 w-10 h-10 group-hover:scale-110 transition-transform" />
          </div>
          <span className="mt-4 text-neutral-300 font-medium whitespace-nowrap text-sm">Cliente Web</span>
          
          <div className="absolute bottom-full mb-4 w-56 p-4 bg-neutral-800 text-sm text-neutral-300 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none text-center shadow-2xl border border-neutral-700 translate-y-2 group-hover:translate-y-0">
            <strong className="text-blue-400 block mb-2 text-base">Next.js</strong>
            {tooltips.client[mode]}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-neutral-800" />
          </div>
        </div>

        {/* Node 2: NestJS Gateway */}
        <div className="absolute top-1/2 left-[35%] -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center cursor-help z-20">
          <div className="w-24 h-24 bg-neutral-900 border-2 border-red-500/50 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.2)] group-hover:border-red-500 transition-colors">
            <Server className="text-red-500 w-12 h-12 group-hover:scale-110 transition-transform" />
          </div>
          <span className="mt-4 text-neutral-300 font-medium whitespace-nowrap text-sm">API Gateway</span>
          
          <div className="absolute bottom-full mb-4 w-64 p-4 bg-neutral-800 text-sm text-neutral-300 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none text-center shadow-2xl border border-neutral-700 translate-y-2 group-hover:translate-y-0">
            <strong className="text-red-400 block mb-2 text-base">NestJS</strong>
            {tooltips.gateway[mode]}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-neutral-800" />
          </div>
        </div>

        {/* Node 3: Core Engine */}
        <div className="absolute top-1/2 left-[65%] -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center cursor-help z-20">
          <div className="w-24 h-24 bg-neutral-900 border-2 border-purple-500/50 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.2)] group-hover:border-purple-500 transition-colors">
            <Braces className="text-purple-400 w-12 h-12 group-hover:scale-110 transition-transform" />
          </div>
          <span className="mt-4 text-neutral-300 font-medium whitespace-nowrap text-sm">Core Engine</span>
          
          <div className="absolute bottom-full mb-4 w-72 p-4 bg-neutral-800 text-sm text-neutral-300 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none text-center shadow-2xl border border-neutral-700 translate-y-2 group-hover:translate-y-0">
            <strong className="text-purple-400 block mb-2 text-base">C++ (El Músculo)</strong>
            {tooltips.core[mode]}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-neutral-800" />
          </div>
        </div>

        {/* Node 4: DB (Postgres) */}
        <div className="absolute top-[20%] left-[90%] -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center cursor-help z-20">
          <div className="w-20 h-20 bg-neutral-900 border border-emerald-500/30 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.1)] group-hover:border-emerald-500 transition-colors">
            <Database className="text-emerald-400 w-10 h-10 group-hover:scale-110 transition-transform" />
          </div>
          <span className="mt-4 text-neutral-300 font-medium whitespace-nowrap text-sm">DB Metadatos</span>
          
          <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 w-64 p-4 bg-neutral-800 text-sm text-neutral-300 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none text-center shadow-2xl border border-neutral-700 translate-x-2 group-hover:translate-x-0">
            <strong className="text-emerald-400 block mb-2 text-base">Supabase PostgreSQL</strong>
            {tooltips.db[mode]}
            <div className="absolute top-1/2 -right-4 -translate-y-1/2 border-8 border-transparent border-l-neutral-800" />
          </div>
        </div>

        {/* Node 5: Storage (Bucket) */}
        <div className="absolute top-[80%] left-[90%] -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center cursor-help z-20">
          <div className="w-20 h-20 bg-neutral-900 border border-cyan-500/30 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.1)] group-hover:border-cyan-500 transition-colors">
            <Cloud className="text-cyan-400 w-10 h-10 group-hover:scale-110 transition-transform" />
          </div>
          <span className="mt-4 text-neutral-300 font-medium whitespace-nowrap text-sm">Storage (Bucket)</span>
          
          <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 w-64 p-4 bg-neutral-800 text-sm text-neutral-300 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none text-center shadow-2xl border border-neutral-700 translate-x-2 group-hover:translate-x-0">
            <strong className="text-cyan-400 block mb-2 text-base">Supabase Storage</strong>
            {tooltips.storage[mode]}
            <div className="absolute top-1/2 -right-4 -translate-y-1/2 border-8 border-transparent border-l-neutral-800" />
          </div>
        </div>

      </div>
    </section>
  );
}
