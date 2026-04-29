'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jqlaaaijovxixjfnzxsf.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_key';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function UploadDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [nodes, setNodes] = useState<any[]>([]);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';

  const fetchNodes = async () => {
    const { data, error } = await supabase.from('nodes').select('*').order('name', { ascending: true });
    if (data) {
      setNodes(data);
    }
  };

  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${backendUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(`Upload successful! File processed by DCFS Core Engine.`);
        fetchNodes();
      } else {
        const error = await response.text();
        setMessage(`Upload failed: ${error}`);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message || 'Network error'}`);
    } finally {
      setUploading(false);
      setFile(null);
    }
  };

  return (
    <section id="dashboard" className="min-h-screen py-20 px-6 flex items-center justify-center bg-neutral-950">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Prueba el Sistema</h2>
          <p className="text-neutral-400">Sube un archivo y observa cómo los discos (nodos) se llenan en tiempo real.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <section className="lg:col-span-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-6 text-white">Subir Archivo</h2>
            
            <div className="space-y-4">
              <label className="block w-full border-2 border-dashed border-neutral-700 hover:border-emerald-500 transition-colors rounded-xl p-8 text-center cursor-pointer">
                <span className="text-neutral-300">
                  {file ? file.name : 'Selecciona un archivo'}
                </span>
                <input type="file" className="hidden" onChange={handleFileChange} />
              </label>

              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className={`w-full py-3 rounded-xl font-medium transition-all ${
                  !file || uploading 
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                }`}
              >
                {uploading ? 'Fragmentando...' : 'Procesar en C++ Core'}
              </button>

              {message && (
                <div className={`p-4 rounded-xl text-sm ${message.includes('Error') || message.includes('failed') ? 'bg-red-950/50 text-red-400 border border-red-900/50' : 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/50'}`}>
                  {message}
                </div>
              )}
            </div>
          </section>

          {/* Nodes Section */}
          <section className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-6 text-white">Nodos de Almacenamiento (Realtime)</h2>
            
            <div className="space-y-6">
              {nodes.length === 0 && <p className="text-neutral-500">Cargando nodos desde Supabase...</p>}
              {nodes.map(node => {
                const percentage = Math.min(100, (Number(node.current_usage) / Number(node.max_capacity)) * 100);
                return (
                  <div key={node.id} className="bg-neutral-950 rounded-xl p-5 border border-neutral-800 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-3 relative z-10">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                        <h3 className="font-medium text-neutral-200">{node.name}</h3>
                        <span className="text-xs text-neutral-600 font-mono">({node.folder_path})</span>
                      </div>
                      <span className="text-xs text-neutral-500 font-mono">
                        {(Number(node.current_usage) / 1024 / 1024).toFixed(2)} MB / {(Number(node.max_capacity) / 1024 / 1024).toFixed(0)} MB
                      </span>
                    </div>
                    
                    <div className="w-full bg-neutral-800 rounded-full h-2.5 overflow-hidden relative z-10">
                      <div 
                        className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
