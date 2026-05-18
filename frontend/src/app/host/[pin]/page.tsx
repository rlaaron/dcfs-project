'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, HardDrive, Package, Loader2, Server, Play, StopCircle, Download, Code2, X } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jqlaaaijovxixjfnzxsf.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxbGFhYWlqb3Z4aXhqZm56eHNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczODM5OTYsImV4cCI6MjA5Mjk1OTk5Nn0.iYjMJK8NWtTDYlfns3vhtXZbjrOMNTs7ULYA-cTJQu4';
const supabase = createClient(supabaseUrl, supabaseKey);

type Phase = 'lobby' | 'active';

export default function HostDashboard() {
  const params = useParams();
  const pin = params.pin as string;
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('lobby');
  const [nodes, setNodes] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);

  // Derive join URL dynamically based on host
  const [joinUrl, setJoinUrl] = useState('');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setJoinUrl(`${window.location.origin}/join/${pin}`);
    }
  }, [pin]);

  const fetchData = async () => {
    const { data: pData } = await supabase.from('participants').select('*').eq('session_pin', pin);
    if (pData) setParticipants(pData);

    const { data: nodesData } = await supabase.from('nodes').select('*').eq('session_pin', pin).order('name', { ascending: true });
    if (nodesData) setNodes(nodesData);

    const { data: filesData } = await supabase.from('files').select('*, chunks(chunk_index, size, nodes(name))').eq('session_pin', pin).order('created_at', { ascending: false });
    if (filesData) setFiles(filesData);
  };

  useEffect(() => {
    fetchData();

    // Subscribe to realtime changes for this session
    const channel = supabase.channel(`public:host:${pin}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `session_pin=eq.${pin}` }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'files', filter: `session_pin=eq.${pin}` }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nodes', filter: `session_pin=eq.${pin}` }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chunks' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pin]);

  // Group files by nickname
  const usersMap = useMemo(() => {
    const map = new Map<string, any[]>();
    // Initialize map with all registered participants so they show up even with 0 files
    participants.forEach(p => {
      map.set(p.nickname, []);
    });
    
    // Add files to corresponding participant
    files.forEach(f => {
      if (!f.nickname) return;
      if (!map.has(f.nickname)) map.set(f.nickname, []);
      map.get(f.nickname)!.push(f);
    });
    return map;
  }, [files, participants]);

  const users = Array.from(usersMap.keys());

  const handleEndSession = async () => {
    if (!window.confirm("¿Estás seguro de que quieres terminar la sesión? Esto eliminará todos los archivos y desconectará a todos.")) return;
    setIsEnding(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://dcfs-backend-production.up.railway.app'}/session/${pin}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(await res.text());
      router.replace('/interactive');
    } catch (err: any) {
      alert(`Error al terminar sesión: ${err.message}`);
      setIsEnding(false);
    }
  };

  const handleDownload = (fileId: string) => {
    window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://dcfs-backend-production.up.railway.app'}/file/${fileId}/download`;
  };

  if (phase === 'lobby') {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-200 flex flex-col items-center justify-center p-6">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">Sala de Espera</h1>
          <p className="text-xl text-neutral-400">Escanea el código QR para unirte a la sesión interactiva</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.1)] mb-8">
          {joinUrl ? (
            <QRCodeSVG value={joinUrl} size={300} bgColor="#ffffff" fgColor="#000000" />
          ) : (
            <div className="w-[300px] h-[300px] flex items-center justify-center bg-neutral-100 rounded-xl">
              <Loader2 className="w-12 h-12 animate-spin text-neutral-400" />
            </div>
          )}
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl px-12 py-6 mb-12 flex flex-col items-center">
          <span className="text-sm text-neutral-500 uppercase tracking-widest font-bold mb-2">PIN DE ACCESO ALTERNATIVO</span>
          <span className="text-6xl font-mono font-bold tracking-[0.2em] text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">
            {pin}
          </span>
          <span className="mt-2 text-neutral-400 font-mono">{joinUrl.replace('https://', '').replace('http://', '')}</span>
        </div>

        <div className="w-full max-w-4xl">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Participantes Unidos ({participants.length})
          </h2>
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {participants.length === 0 && (
              <span className="text-neutral-500 italic">Esperando a que alguien se una...</span>
            )}
            <AnimatePresence>
              {participants.map(p => (
                <motion.div 
                  key={p.nickname}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-6 py-3 rounded-full font-bold text-lg"
                >
                  {p.nickname}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={() => setPhase('active')}
              disabled={participants.length === 0}
              className="py-4 px-12 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 rounded-full font-bold text-xl transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center"
            >
              <Play className="w-6 h-6 mr-2" fill="currentColor" /> Iniciar Experiencia
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-6 font-sans flex flex-col">
      
      {/* HOST HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-neutral-900 border border-neutral-800 rounded-3xl p-6 mb-8 shadow-2xl">
        <div className="flex items-center mb-6 md:mb-0">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mr-6 border border-neutral-800 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
            {joinUrl ? (
              <QRCodeSVG value={joinUrl} size={48} bgColor="#ffffff" fgColor="#000000" />
            ) : (
              <Loader2 className="animate-spin text-neutral-500" />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Sistema Activo</h1>
            <p className="text-neutral-400">Escanea el QR o entra a <strong className="text-white">{joinUrl.replace('https://', '').replace('http://', '')}</strong></p>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="bg-neutral-950 px-6 py-3 rounded-2xl border border-neutral-800 flex flex-col items-center">
            <span className="text-xs text-neutral-500 uppercase tracking-widest font-bold mb-1">PIN</span>
            <span className="text-3xl font-mono font-bold tracking-[0.2em] text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">
              {pin}
            </span>
          </div>
          <button 
            onClick={() => setShowCodeModal(true)}
            className="flex flex-col items-center justify-center p-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-2xl transition-colors border border-blue-500/20"
          >
            <Code2 className="w-6 h-6 mb-1" />
            <span className="text-xs font-bold uppercase">Código C++</span>
          </button>
          <button 
            onClick={handleEndSession}
            disabled={isEnding}
            className="flex flex-col items-center justify-center p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl transition-colors border border-red-500/20"
          >
            {isEnding ? <Loader2 className="w-6 h-6 animate-spin mb-1" /> : <StopCircle className="w-6 h-6 mb-1" />}
            <span className="text-xs font-bold uppercase">Terminar</span>
          </button>
        </div>
      </div>

      {/* DASHBOARD GRID */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: USERS WALL */}
        <div className="lg:col-span-2 flex flex-col">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <Users className="w-6 h-6 mr-2 text-blue-400" /> 
            Participantes ({users.length})
          </h2>
          
          {users.length === 0 ? (
            <div className="flex-grow flex flex-col items-center justify-center border-2 border-dashed border-neutral-800 rounded-3xl p-12 text-center">
              <Loader2 className="w-12 h-12 text-neutral-600 animate-spin mb-4" />
              <p className="text-neutral-500 text-lg">Nadie se ha unido aún...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-max">
              <AnimatePresence>
                {users.map(user => {
                  const userFiles = usersMap.get(user)!;
                  const totalMB = userFiles.reduce((acc, f) => acc + f.total_size, 0) / 1024 / 1024;
                  const isSelected = selectedUser === user;

                  return (
                    <motion.div 
                      key={user}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={() => setSelectedUser(isSelected ? null : user)}
                      className={`cursor-pointer rounded-2xl p-5 border transition-all ${isSelected ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'bg-neutral-900 border-neutral-800 hover:border-neutral-600 hover:bg-neutral-800'}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-full bg-neutral-950 flex items-center justify-center border border-neutral-800">
                          <span className="text-lg font-bold text-white">{user.charAt(0).toUpperCase()}</span>
                        </div>
                        {/* Fake active indicator when files are present */}
                        {userFiles.length > 0 && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>}
                      </div>
                      <h3 className="font-bold text-white text-lg truncate">{user}</h3>
                      <div className="mt-2 flex items-center text-xs text-neutral-400 space-x-3">
                        <span className="flex items-center"><Package className="w-3 h-3 mr-1"/> {userFiles.length}</span>
                        <span className="flex items-center"><HardDrive className="w-3 h-3 mr-1"/> {totalMB.toFixed(2)} MB</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* RIGHT: INSPECTOR & NODES */}
        <div className="flex flex-col space-y-8">
          
          {/* USER INSPECTOR (DRILL DOWN) */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 min-h-[300px] flex flex-col">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <Server className="w-6 h-6 mr-2 text-purple-400" /> 
              Inspector de Archivos
            </h2>
            
            {!selectedUser ? (
              <div className="flex-grow flex items-center justify-center text-neutral-500 text-sm text-center">
                Haz clic en un participante para ver cómo el Core C++ fragmentó sus archivos.
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto max-h-[400px] custom-scrollbar pr-2">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-4">
                  <span className="text-white font-bold">Archivos de {selectedUser}</span>
                  <button onClick={() => setSelectedUser(null)} className="text-xs text-neutral-500 hover:text-white">Cerrar</button>
                </div>
                
                {(!usersMap.get(selectedUser) || usersMap.get(selectedUser)!.length === 0) && <p className="text-sm text-neutral-500">Sin archivos aún.</p>}

                {usersMap.get(selectedUser) && usersMap.get(selectedUser)!.map((f) => (
                  <div key={f.id} className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-semibold text-white truncate max-w-[150px]" title={f.filename}>{f.filename}</div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDownload(f.id); }}
                        className="text-emerald-400 hover:text-emerald-300 p-1 bg-emerald-500/10 rounded"
                        title="Descargar y reensamblar desde C++"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {f.chunks && f.chunks.length > 0 ? (
                        f.chunks.sort((a: any, b: any) => a.chunk_index - b.chunk_index).map((chunk: any) => (
                          <div key={chunk.chunk_index} className="text-[10px] bg-neutral-900 border border-neutral-700 px-2 py-1 rounded flex items-center">
                            <span className="text-neutral-400 mr-1">P{chunk.chunk_index}:</span>
                            <span className="text-purple-400 font-mono mr-2">{chunk.nodes?.name}</span>
                            <span className="text-neutral-500 font-mono">({(chunk.size / 1024).toFixed(1)} KB)</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-neutral-500 flex items-center"><Loader2 className="w-3 h-3 animate-spin mr-1"/> Procesando en C++...</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* NODES STATE */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <HardDrive className="w-6 h-6 mr-2 text-cyan-400" /> 
              Discos Físicos
            </h2>
            <div className="space-y-4">
              {nodes.map(node => {
                const percentage = Math.min(100, (Number(node.current_usage) / Number(node.max_capacity)) * 100);
                return (
                  <div key={node.id} className="bg-neutral-950 rounded-xl p-4 border border-neutral-800">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-neutral-200 text-sm flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${percentage > 90 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'}`}></div>
                        {node.name}
                      </h4>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {(Number(node.current_usage) / 1024 / 1024).toFixed(2)} / {(Number(node.max_capacity) / 1024 / 1024).toFixed(0)} MB
                      </span>
                    </div>
                    <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                      <motion.div 
                        className={`h-1.5 rounded-full ${percentage > 90 ? 'bg-red-500' : 'bg-cyan-500'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ type: "spring" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ACADEMIC CODE MODAL */}
      <AnimatePresence>
        {showCodeModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-50 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-neutral-800 bg-neutral-950">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                    <Code2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Monitor de Concurrencia (Académico)</h2>
                    <p className="text-sm text-neutral-400">Implementación de hilos y exclusión mutua en C++17</p>
                  </div>
                </div>
                <button onClick={() => setShowCodeModal(false)} className="text-neutral-500 hover:text-white p-2 bg-neutral-800 hover:bg-neutral-700 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-6 space-y-8 custom-scrollbar">
                
                {/* Snippet 1 */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="bg-purple-500/20 text-purple-400 text-xs font-bold px-2 py-1 rounded">Requisito: std::thread y condition_variable</span>
                    <h3 className="text-lg font-bold text-white">ThreadManager.cpp</h3>
                  </div>
                  <p className="text-sm text-neutral-400">El Core Engine utiliza un ThreadPool para evitar la creación indiscriminada de hilos por cada cliente, reutilizando los recursos y usando una variable de condición para despertar hilos dormidos cuando hay trabajo.</p>
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 overflow-x-auto">
                    <pre className="text-sm font-mono text-neutral-300 leading-relaxed whitespace-pre">
                      <code dangerouslySetInnerHTML={{
                        __html: `<span class="text-blue-400">ThreadPool::ThreadPool</span>(<span class="text-blue-400">size_t</span> numThreads) : stop(<span class="text-blue-400">false</span>) {
    <span class="text-blue-400">for</span> (<span class="text-blue-400">size_t</span> i = <span class="text-yellow-200">0</span>; i &lt; numThreads; ++i) {
        workers.emplace_back([<span class="text-blue-400">this</span>] {
            <span class="text-blue-400">for</span> (;;) {
                <span class="text-blue-400">std</span>::function&lt;<span class="text-blue-400">void</span>()&gt; task;
                { <span class="text-emerald-500/80 italic">// Ámbito del Lock</span>
                    <span class="text-pink-400 font-bold">std::unique_lock&lt;std::mutex&gt; lock(this-&gt;queueMutex);</span>
                    <span class="text-pink-400 font-bold">this-&gt;condition.wait(lock, [this] { return this-&gt;stop || !this-&gt;tasks.empty(); });</span>
                    
                    <span class="text-blue-400">if</span> (<span class="text-blue-400">this</span>-&gt;stop && <span class="text-blue-400">this</span>-&gt;tasks.empty()) <span class="text-blue-400">return</span>;
                    task = <span class="text-blue-400">std</span>::move(<span class="text-blue-400">this</span>-&gt;tasks.front());
                    <span class="text-blue-400">this</span>-&gt;tasks.pop();
                }
                task(); <span class="text-emerald-500/80 italic">// Ejecución concurrente del fragmento</span>
            }
        });
    }
}`
                      }} />
                    </pre>
                  </div>
                </div>

                {/* Snippet 2 */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <span className="bg-cyan-500/20 text-cyan-400 text-xs font-bold px-2 py-1 rounded">Requisito: std::mutex y Round-Robin</span>
                    <h3 className="text-lg font-bold text-white">MetadataMonitor.cpp</h3>
                  </div>
                  <p className="text-sm text-neutral-400">Para garantizar que múltiples hilos puedan asignar espacio en los discos sin sobreescribir la cuota al mismo tiempo, se implementó el patrón Monitor usando exclusión mutua.</p>
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 overflow-x-auto">
                    <pre className="text-sm font-mono text-neutral-300 leading-relaxed whitespace-pre">
                      <code dangerouslySetInnerHTML={{
                        __html: `<span class="text-blue-400">bool</span> <span class="text-blue-400">MetadataMonitor::allocateSpace</span>(<span class="text-blue-400">size_t</span> chunkSize, <span class="text-blue-400">std</span>::string&amp; out_node_id) {
    <span class="text-pink-400 font-bold">std::lock_guard&lt;std::mutex&gt; lock(nodesMutex);</span> <span class="text-emerald-500/80 italic">// Exclusión mutua garantizada</span>
    
    <span class="text-blue-400">if</span> (nodes.empty()) <span class="text-blue-400">return false</span>;

    <span class="text-emerald-500/80 italic">// Algoritmo Round-Robin para garantizar distribución equitativa</span>
    <span class="text-blue-400">static int</span> rr_index = <span class="text-yellow-200">0</span>;
    <span class="text-blue-400">int</span> current_idx = <span className="text-yellow-200">0</span>;
    
    <span class="text-blue-400">for</span> (<span class="text-blue-400">auto</span>&amp; pair : nodes) {
        <span class="text-blue-400">if</span> (current_idx == rr_index % nodes.size()) {
            Node&amp; n = pair.second;
            <span class="text-blue-400">if</span> (n.max_capacity &gt; n.current_usage &amp;&amp; (n.max_capacity - n.current_usage) &gt;= chunkSize) {
                n.current_usage += chunkSize;
                out_node_id = n.id;
                rr_index++;
                <span class="text-blue-400">return true</span>;
            }
        }
        current_idx++;
    }
    <span class="text-blue-400">return false</span>;
}`
                      }} />
                    </pre>
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
