'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { LogOut, CloudUpload, Trash2, Download, Info, File as FileIcon, Loader2, X, HardDrive } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jqlaaaijovxixjfnzxsf.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_key';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function ParticipantDashboard() {
  const router = useRouter();
  const params = useParams();
  const pin = params.pin as string;
  const [nickname, setNickname] = useState('');
  
  const [files, setFiles] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFileForInfo, setSelectedFileForInfo] = useState<any | null>(null);

  useEffect(() => {
    const storedNick = localStorage.getItem(`dcfs_nick_${pin}`);
    if (!storedNick) {
      router.replace(`/join/${pin}`);
    } else {
      setNickname(storedNick);
    }
  }, [pin, router]);

  useEffect(() => {
    if (!nickname) return;

    const fetchFiles = async () => {
      const { data } = await supabase
        .from('files')
        .select('*, chunks(chunk_index, size, nodes(name))')
        .eq('session_pin', pin)
        .eq('nickname', nickname)
        .order('created_at', { ascending: false });
      
      if (data) setFiles(data);
    };

    fetchFiles();

    // Subscribe to realtime changes for this user's files
    const channel = supabase.channel(`public:files:${pin}:${nickname}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'files', filter: `session_pin=eq.${pin}` }, () => {
        fetchFiles();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chunks' }, () => {
        fetchFiles(); // Re-fetch to get new chunks info
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pin, nickname]);

  const handleLogout = () => {
    localStorage.removeItem(`dcfs_nick_${pin}`);
    router.replace(`/interactive`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_pin', pin);
    formData.append('nickname', nickname);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002'}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (err: any) {
      alert(`Error al subir: ${err.message}`);
    } finally {
      setIsUploading(false);
      // reset input
      e.target.value = '';
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este archivo?")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002'}/file/${fileId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  const handleDownload = (fileId: string) => {
    window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002'}/file/${fileId}/download`;
  };

  if (!nickname) return null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 flex flex-col items-center">
      <div className="w-full max-w-lg p-6">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Hola, {nickname} 👋</h1>
            <p className="text-sm text-neutral-500 font-mono">Sala PIN: {pin}</p>
          </div>
          <button onClick={handleLogout} className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* UPLOADER */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 mb-8 text-center relative overflow-hidden">
          <input 
            type="file" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          <div className="flex flex-col items-center justify-center pointer-events-none">
            {isUploading ? (
              <Loader2 className="w-12 h-12 text-blue-500 mb-3 animate-spin" />
            ) : (
              <CloudUpload className="w-12 h-12 text-blue-400 mb-3" />
            )}
            <h3 className="text-xl font-bold text-white mb-1">
              {isUploading ? 'Subiendo al Cluster...' : 'Toca para Subir un Archivo'}
            </h3>
            <p className="text-sm text-neutral-400">
              Cualquier archivo. Se distribuirá concurrentemente.
            </p>
          </div>
        </div>

        {/* FILE LIST */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">Tus Archivos en el Cluster</h3>
          
          {files.length === 0 && (
            <div className="text-center p-8 border border-dashed border-neutral-800 rounded-2xl">
              <p className="text-neutral-500 text-sm">Aún no has subido archivos.</p>
            </div>
          )}

          {files.map(f => (
            <div key={f.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center flex-shrink-0">
                  <FileIcon className="text-neutral-400 w-5 h-5" />
                </div>
                <div className="truncate pr-4">
                  <h4 className="text-sm font-semibold text-white truncate w-40 sm:w-60">{f.filename}</h4>
                  <p className="text-xs text-neutral-500">{(f.total_size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <button onClick={() => setSelectedFileForInfo(f)} className="p-2 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors" title="Info de Fragmentación">
                  <Info className="w-4 h-4" />
                </button>
                <button onClick={() => handleDownload(f.id)} className="p-2 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors" title="Descargar">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(f.id)} className="p-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors" title="Eliminar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* INFO MODAL */}
      {selectedFileForInfo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center">
                <HardDrive className="w-5 h-5 mr-2 text-blue-400" />
                Fragmentación
              </h3>
              <button onClick={() => setSelectedFileForInfo(null)} className="text-neutral-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-neutral-400 mb-4">
              Tu archivo <strong className="text-white">{selectedFileForInfo.filename}</strong> fue procesado por el Core C++ y dividido de la siguiente manera:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
              {selectedFileForInfo.chunks && selectedFileForInfo.chunks.length > 0 ? (
                selectedFileForInfo.chunks.sort((a: any, b: any) => a.chunk_index - b.chunk_index).map((chunk: any) => (
                  <div key={chunk.chunk_index} className="flex justify-between items-center bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                    <span className="text-sm text-neutral-300">Parte {chunk.chunk_index} <span className="text-[10px] text-neutral-500 ml-2">({(chunk.size / 1024).toFixed(1)} KB)</span></span>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                      {chunk.nodes.name}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center p-4">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-neutral-500">Fragmentando en discos...</p>
                </div>
              )}
            </div>

            <button 
              onClick={() => setSelectedFileForInfo(null)}
              className="w-full mt-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-semibold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
