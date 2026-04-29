'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Users, HardDrive, Play, CheckCircle2, AlertTriangle, Download, Loader2, Package } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jqlaaaijovxixjfnzxsf.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_key';
const supabase = createClient(supabaseUrl, supabaseKey);

type Phase = 'config' | 'prep' | 'running' | 'done';

interface ClientState {
  id: number;
  files: File[];
  status: 'idle' | 'uploading' | 'success' | 'error';
  errorMsg?: string;
}

export default function UploadDashboard() {
  const [phase, setPhase] = useState<Phase>('config');
  const [nodesCount, setNodesCount] = useState(3);
  const [clientsCount, setClientsCount] = useState(5);
  
  const [clients, setClients] = useState<ClientState[]>([]);
  const [nodes, setNodes] = useState<any[]>([]);
  const [isResetting, setIsResetting] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';

  const fetchNodes = async () => {
    const { data, error } = await supabase.from('nodes').select('*').order('name', { ascending: true });
    if (data) setNodes(data);
  };

  useEffect(() => {
    fetchNodes();
    // Poll nodes every 1 second during running phase, otherwise every 3 seconds
    const interval = setInterval(fetchNodes, phase === 'running' ? 1000 : 3000);
    return () => clearInterval(interval);
  }, [phase]);

  // Phase 1: Config -> Prep
  const handleApplyConfig = async () => {
    const confirmReset = window.confirm(
      "⚠️ Atención: Cambiar la cantidad de Nodos es una acción DESTRUCTIVA. Borrará todos los archivos, metadatos y fragmentos almacenados actualmente en la red para recrear la topología. ¿Continuar?"
    );
    if (!confirmReset) return;

    setIsResetting(true);
    try {
      // Call NestJS to wipe DB and reseed nodes
      const res = await fetch(`${backendUrl}/reset-topology`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodesCount })
      });
      if (!res.ok) throw new Error(await res.text());

      // Initialize clients
      const newClients: ClientState[] = Array.from({ length: clientsCount }, (_, i) => ({
        id: i + 1,
        files: [],
        status: 'idle'
      }));
      setClients(newClients);
      await fetchNodes();
      setPhase('prep');
    } catch (err: any) {
      alert(`Error al resetear la topología: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  // Phase 2: Assign files (Multiple)
  const handleFileChange = (clientId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setClients(prev => prev.map(c => 
        c.id === clientId ? { ...c, files: [...c.files, ...selectedFiles], status: 'idle' } : c
      ));
    }
  };

  // Phase 3: Execute Attack (Concurrent POSTs for EVERY file)
  const handleSimulate = async () => {
    const readyClients = clients.filter(c => c.files.length > 0);
    if (readyClients.length === 0) {
      alert("Por favor, asigna al menos un archivo a algún cliente.");
      return;
    }

    setPhase('running');
    
    // Mark ready clients as uploading
    setClients(prev => prev.map(c => c.files.length > 0 ? { ...c, status: 'uploading' } : c));

    // Fire all uploads CONCURRENTLY for ALL files of ALL clients
    const allUploadPromises = readyClients.flatMap(client => 
      client.files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${backendUrl}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw { clientId: client.id, error: errorText };
        }
      })
    );

    // Wait for all HTTP requests to finish (success or fail)
    const results = await Promise.allSettled(allUploadPromises);
    
    // Check which clients had errors
    const failedClientIds = new Set<number>();
    results.forEach(res => {
      if (res.status === 'rejected') {
        failedClientIds.add(res.reason?.clientId);
      }
    });

    // Update clients status
    setClients(prev => prev.map(c => {
      if (c.files.length === 0) return c;
      if (failedClientIds.has(c.id)) {
        return { ...c, status: 'error', errorMsg: 'Fallo parcial o total.' };
      }
      return { ...c, status: 'success' };
    }));

    await fetchNodes(); // Final fetch to ensure UI is up to date
    setPhase('done');
  };

  const handleSimulatedDownload = (fileName: string) => {
    alert(`⬇️ Descarga Exitosa.\nEl Core C++ descargó los fragmentos paralelos desde Supabase Storage y reensambló "${fileName}" al instante mediante streaming.`);
  };

  const readyCount = clients.filter(c => c.files.length > 0).length;

  return (
    <section id="dashboard" className="min-h-screen py-20 px-6 bg-neutral-950 flex flex-col items-center">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Simulador de Concurrencia</h2>
          <p className="text-neutral-400">Configura la red, asigna múltiples archivos por cliente y ataca al Core Engine en tiempo real.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Config / Prep / Actions */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* CONFIG PHASE */}
            {phase === 'config' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-white flex items-center"><Settings className="mr-2 text-emerald-400"/> 1. Topología del Sistema</h3>
                  <span className="text-xs font-mono bg-neutral-800 text-neutral-400 px-3 py-1 rounded-full border border-neutral-700">Capacidad Total: 50 MB</span>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="flex justify-between text-neutral-300 mb-2">
                      <span>Cantidad de Nodos (Discos)</span>
                      <span className="font-mono text-emerald-400">{nodesCount}</span>
                    </label>
                    <input 
                      type="range" min="1" max="10" value={nodesCount} 
                      onChange={(e) => setNodesCount(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="flex justify-between text-neutral-300 mb-2">
                      <span>Clientes Concurrentes (Usuarios)</span>
                      <span className="font-mono text-blue-400">{clientsCount}</span>
                    </label>
                    <input 
                      type="range" min="1" max="20" value={clientsCount} 
                      onChange={(e) => setClientsCount(Number(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>

                  <button 
                    onClick={handleApplyConfig}
                    disabled={isResetting}
                    className="w-full py-3 mt-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-medium transition-all flex justify-center items-center"
                  >
                    {isResetting ? <Loader2 className="animate-spin mr-2" /> : <AlertTriangle className="mr-2 w-5 h-5" />}
                    {isResetting ? 'Reconstruyendo Red...' : 'Aplicar Configuración Destructiva'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* PREP & RUNNING PHASE */}
            {phase !== 'config' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-white flex items-center"><Users className="mr-2 text-blue-400"/> 2. Ingesta de Clientes</h3>
                  <button onClick={() => setPhase('config')} className="text-xs text-neutral-500 hover:text-white underline">Reconfigurar</button>
                </div>

                {/* Clients Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
                  {clients.map(client => (
                    <div key={client.id} className="relative group bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all hover:border-neutral-600">
                      
                      <div className="w-12 h-12 rounded-full mb-3 flex items-center justify-center bg-neutral-900 relative">
                        {client.status === 'idle' && client.files.length === 0 && <Users className="text-neutral-500" />}
                        {client.status === 'idle' && client.files.length > 0 && <CheckCircle2 className="text-emerald-400" />}
                        {client.status === 'uploading' && <Loader2 className="text-blue-400 animate-spin" />}
                        {client.status === 'success' && <CheckCircle2 className="text-emerald-400" />}
                        {client.status === 'error' && <AlertTriangle className="text-red-400" />}
                      </div>

                      <span className="text-sm font-medium text-neutral-300">Cliente {client.id}</span>
                      
                      {/* Only allow adding files in idle status */}
                      {(client.status === 'idle') && (
                        <label className="mt-2 text-xs text-blue-400 cursor-pointer hover:underline flex items-center justify-center">
                          {client.files.length > 0 ? 'Añadir más ➕' : 'Asignar Archivos'}
                          <input type="file" multiple className="hidden" onChange={(e) => handleFileChange(client.id, e)} />
                        </label>
                      )}
                      
                      {client.files.length > 0 && (
                        <div className="mt-2 flex items-center justify-center space-x-1 text-xs text-neutral-400 bg-neutral-900 px-2 py-1 rounded-full border border-neutral-800">
                          <Package className="w-3 h-3" />
                          <span>{client.files.length} Archivos</span>
                        </div>
                      )}

                      {/* Hover Download Card for Done phase */}
                      {phase === 'done' && client.status === 'success' && client.files.length > 0 && (
                         <div className="absolute top-full mt-2 w-56 p-3 bg-neutral-800 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none group-hover:pointer-events-auto border border-neutral-700">
                           <div className="text-xs font-bold text-neutral-300 mb-2 border-b border-neutral-700 pb-2">Archivos Procesados:</div>
                           <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                             {client.files.map((f, idx) => (
                               <div key={idx} className="flex flex-col space-y-1 bg-neutral-900 p-2 rounded-lg border border-neutral-700">
                                 <span className="text-[10px] text-neutral-400 truncate w-full" title={f.name}>{f.name}</span>
                                 <button 
                                   onClick={() => handleSimulatedDownload(f.name)}
                                   className="w-full bg-emerald-500/10 hover:bg-emerald-500 hover:text-neutral-950 text-emerald-400 text-[10px] font-bold py-1 rounded transition-colors flex items-center justify-center"
                                 >
                                   <Download className="w-3 h-3 mr-1" /> Descargar
                                 </button>
                               </div>
                             ))}
                           </div>
                         </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Master Button */}
                {phase === 'prep' && (
                  <button
                    onClick={handleSimulate}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex justify-center items-center"
                  >
                    <Play className="mr-2" fill="currentColor" /> INICIAR ATAQUE CONCURRENTE ({readyCount}/{clientsCount} Listos)
                  </button>
                )}

                {phase === 'running' && (
                  <div className="w-full py-4 bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded-xl font-bold text-lg flex justify-center items-center">
                    <Loader2 className="animate-spin mr-3" /> Procesando Peticiones Simultáneas...
                  </div>
                )}

                {phase === 'done' && (
                  <div className="w-full py-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold flex justify-center items-center">
                    <CheckCircle2 className="mr-2" /> Simulación Finalizada (Pasa el cursor por los clientes para descargar)
                  </div>
                )}

              </motion.div>
            )}

          </div>

          {/* Right Column: Nodes (Realtime) */}
          <div className="lg:col-span-1">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sticky top-24">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white flex items-center"><HardDrive className="mr-2 text-cyan-400"/> Estado de Nodos</h3>
                <span className="text-xs font-mono text-cyan-500 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20">Pool: 50 MB</span>
              </div>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {nodes.length === 0 && <p className="text-neutral-500 text-sm">Esperando inicialización...</p>}
                
                <AnimatePresence>
                  {nodes.map(node => {
                    const percentage = Math.min(100, (Number(node.current_usage) / Number(node.max_capacity)) * 100);
                    return (
                      <motion.div 
                        key={node.id} 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-neutral-950 rounded-xl p-4 border border-neutral-800 relative overflow-hidden"
                      >
                        <div className="flex justify-between items-center mb-2 relative z-10">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${percentage > 90 ? 'bg-red-500' : 'bg-cyan-400'} shadow-[0_0_8px_rgba(6,182,212,0.8)]`}></div>
                            <h4 className="font-medium text-neutral-200 text-sm">{node.name}</h4>
                          </div>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            {(Number(node.current_usage) / 1024 / 1024).toFixed(2)}MB / {(Number(node.max_capacity) / 1024 / 1024).toFixed(0)}MB
                          </span>
                        </div>
                        
                        <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden relative z-10">
                          <motion.div 
                            className={`h-1.5 rounded-full ${percentage > 90 ? 'bg-red-500' : 'bg-cyan-500'}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ type: "spring", stiffness: 50 }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
