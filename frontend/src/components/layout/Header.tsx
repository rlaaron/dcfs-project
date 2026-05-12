'use client';

import { FileBox, Network, Cpu, Database, Play } from 'lucide-react';
import Link from 'next/link';

export default function Header() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 text-emerald-400 font-bold text-xl cursor-pointer">
          <Database className="w-6 h-6" />
          <span>DCFS</span>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-neutral-400">
          <button onClick={() => { if(window.location.pathname === '/') scrollTo('architecture'); else window.location.href = '/#architecture'; }} className="hover:text-emerald-400 transition-colors flex items-center space-x-2">
            <Network className="w-4 h-4" />
            <span>Arquitectura</span>
          </button>
          <button onClick={() => { if(window.location.pathname === '/') scrollTo('concurrency'); else window.location.href = '/#concurrency'; }} className="hover:text-emerald-400 transition-colors flex items-center space-x-2">
            <Cpu className="w-4 h-4" />
            <span>Motor Concurrente C++</span>
          </button>
          <button onClick={() => { if(window.location.pathname === '/') scrollTo('dashboard'); else window.location.href = '/#dashboard'; }} className="hover:text-emerald-400 transition-colors flex items-center space-x-2">
            <FileBox className="w-4 h-4" />
            <span>Dashboard Local</span>
          </button>
        </nav>

        <div className="flex items-center space-x-3">
          <Link 
            href="/interactive"
            className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-500/20 transition-all flex items-center"
          >
            <Play className="w-4 h-4 mr-1" />
            Demo Kahoot
          </Link>
          <button 
            onClick={() => { if(window.location.pathname === '/') scrollTo('dashboard'); else window.location.href = '/#dashboard'; }}
            className="hidden sm:block bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-full text-sm font-medium hover:bg-emerald-500/20 transition-all"
          >
            Simulador
          </button>
        </div>
      </div>
    </header>
  );
}
