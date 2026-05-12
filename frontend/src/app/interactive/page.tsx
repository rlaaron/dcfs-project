'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HardDrive, Users, Play, Loader2, ArrowRight } from 'lucide-react';

export default function InteractiveLobby() {
  const router = useRouter();
  const [nodesCount, setNodesCount] = useState(3);
  const [isCreating, setIsCreating] = useState(false);
  const [joinPin, setJoinPin] = useState('');

  const handleCreateSession = async () => {
    setIsCreating(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002'}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodesCount })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      router.push(`/host/${data.pin}`);
    } catch (err: any) {
      alert(`Error al crear sesión: ${err.message}`);
      setIsCreating(false);
    }
  };

  const handleJoinSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinPin.trim().length > 0) {
      router.push(`/join/${joinPin.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-neutral-200">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Demo Interactiva C++</h1>
        <p className="text-neutral-400 max-w-xl mx-auto">
          Prueba el sistema de archivos distribuido en tiempo real. Crea una sesión como Host o únete a una existente desde tu celular.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* HOST CARD */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 flex flex-col">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mr-4">
              <Play className="text-emerald-400 w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Crear Sesión</h2>
              <p className="text-sm text-neutral-400">Proyecta esto en la pantalla principal</p>
            </div>
          </div>
          
          <div className="flex-grow space-y-6">
            <div>
              <label className="flex justify-between text-neutral-300 mb-2">
                <span>Discos a simular (Nodos)</span>
                <span className="font-mono text-emerald-400">{nodesCount}</span>
              </label>
              <input 
                type="range" min="1" max="10" value={nodesCount} 
                onChange={(e) => setNodesCount(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
              <p className="text-xs text-neutral-400">
                Al crear la sesión se generará un código QR. Las personas podrán escanearlo con sus teléfonos para subir archivos concurrentemente hacia estos {nodesCount} discos.
              </p>
            </div>
          </div>

          <button 
            onClick={handleCreateSession}
            disabled={isCreating}
            className="w-full mt-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-xl font-bold text-lg transition-all flex justify-center items-center"
          >
            {isCreating ? <Loader2 className="animate-spin mr-2" /> : <HardDrive className="mr-2 w-5 h-5" />}
            {isCreating ? 'Iniciando Core...' : 'Iniciar Servidor (Host)'}
          </button>
        </div>

        {/* JOIN CARD */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 flex flex-col">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mr-4">
              <Users className="text-blue-400 w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Unirse a Sesión</h2>
              <p className="text-sm text-neutral-400">Participa desde tu celular o laptop</p>
            </div>
          </div>

          <form onSubmit={handleJoinSession} className="flex-grow flex flex-col justify-center space-y-6">
            <div>
              <label className="block text-neutral-300 mb-2 font-medium">PIN de la Sala</label>
              <input 
                type="text" 
                placeholder="Ej. 1234" 
                value={joinPin}
                onChange={(e) => setJoinPin(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-4 text-2xl text-center tracking-[0.2em] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-neutral-700 transition-all"
                maxLength={4}
                required
              />
            </div>
            <button 
              type="submit"
              disabled={joinPin.length < 3}
              className="w-full py-4 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 rounded-xl font-bold text-lg transition-all flex justify-center items-center"
            >
              Unirse como Participante <ArrowRight className="ml-2 w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
