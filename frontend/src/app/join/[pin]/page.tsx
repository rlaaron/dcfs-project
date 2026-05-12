'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Users, ArrowRight, Loader2 } from 'lucide-react';

export default function JoinSession() {
  const router = useRouter();
  const params = useParams();
  const pin = params.pin as string;
  const [nickname, setNickname] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    // If they already have a nickname for this pin, skip to participant page
    const storedNick = localStorage.getItem(`dcfs_nick_${pin}`);
    if (storedNick) {
      router.replace(`/participant/${pin}`);
    }
  }, [pin, router]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim()) {
      setIsJoining(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002'}/participant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_pin: pin, nickname: nickname.trim() })
        });
        
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText);
        }

        localStorage.setItem(`dcfs_nick_${pin}`, nickname.trim());
        router.push(`/participant/${pin}`);
      } catch (err: any) {
        alert(`Error al unirse: ${err.message}`);
        setIsJoining(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-neutral-200">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 flex flex-col items-center shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
          <Users className="text-blue-400 w-8 h-8" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2">Unirse a la Sala</h1>
        <div className="bg-neutral-950 text-neutral-400 font-mono text-sm px-4 py-2 rounded-lg mb-8 border border-neutral-800">
          PIN: <span className="text-white font-bold">{pin}</span>
        </div>

        <form onSubmit={handleJoin} className="w-full space-y-6">
          <div>
            <label className="block text-neutral-400 text-center mb-4 text-lg">¿Cuál es tu Nickname?</label>
            <input 
              type="text" 
              placeholder="Ej. Hacker_99" 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={isJoining}
              className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl px-4 py-4 text-center text-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 placeholder:text-neutral-700 transition-all"
              required
              autoFocus
              maxLength={15}
            />
          </div>
          
          <button 
            type="submit"
            disabled={nickname.trim().length < 2 || isJoining}
            className="w-full py-4 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 rounded-xl font-bold text-lg transition-all flex justify-center items-center shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          >
            {isJoining ? <Loader2 className="animate-spin mr-2 w-5 h-5" /> : '¡Entrar a la Sala!'} 
            {!isJoining && <ArrowRight className="ml-2 w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
}
