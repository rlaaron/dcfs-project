'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Local Supabase configuration for Frontend
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [nodes, setNodes] = useState<any[]>([]);

  const fetchNodes = async () => {
    const { data, error } = await supabase.from('nodes').select('*').order('name', { ascending: true });
    if (data) {
      setNodes(data);
    }
  };

  // Fetch nodes on mount and poll every 2 seconds
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
      const response = await fetch('http://localhost:3000/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(`Upload successful! File processed by DCFS Core Engine.`);
        fetchNodes(); // force immediate refresh
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
    <div className="min-h-screen bg-neutral-950 text-white p-8 font-sans">
      <header className="max-w-5xl mx-auto mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-emerald-400">DCFS Orchestrator</h1>
        <p className="text-neutral-400 mt-2">Distributed Concurrent File System • Control Panel</p>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Upload Section */}
        <section className="lg:col-span-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-6">Upload File</h2>
          
          <div className="space-y-4">
            <label className="block w-full border-2 border-dashed border-neutral-700 hover:border-emerald-500 transition-colors rounded-xl p-8 text-center cursor-pointer">
              <span className="text-neutral-300">
                {file ? file.name : 'Select a file or drag & drop'}
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
              {uploading ? 'Uploading & Distributing...' : 'Process via Core Engine'}
            </button>

            {message && (
              <div className={`p-4 rounded-xl text-sm ${message.includes('Error') || message.includes('failed') ? 'bg-red-950/50 text-red-400 border border-red-900/50' : 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/50'}`}>
                {message}
              </div>
            )}
          </div>
        </section>

        {/* Nodes (Simulated Disks) Section */}
        <section className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-6">Storage Nodes (Realtime Metadata)</h2>
          
          <div className="space-y-6">
            {nodes.length === 0 && <p className="text-neutral-500">Loading nodes from Supabase...</p>}
            {nodes.map(node => {
              const percentage = Math.min(100, (Number(node.current_usage) / Number(node.max_capacity)) * 100);
              return (
                <div key={node.id} className="bg-neutral-950 rounded-xl p-5 border border-neutral-800">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                      <h3 className="font-medium text-neutral-200">{node.name}</h3>
                      <span className="text-xs text-neutral-600 font-mono">({node.folder_path})</span>
                    </div>
                    <span className="text-xs text-neutral-500 font-mono">
                      {(Number(node.current_usage) / 1024 / 1024).toFixed(2)} MB / {(Number(node.max_capacity) / 1024 / 1024).toFixed(0)} MB
                    </span>
                  </div>
                  
                  <div className="w-full bg-neutral-800 rounded-full h-2.5 overflow-hidden">
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
      </main>
    </div>
  );
}
