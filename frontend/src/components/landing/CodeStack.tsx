'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, Cpu, Database, Share2, ChevronRight } from 'lucide-react';

const SNIPPETS = [
  {
    id: 'threadpool',
    title: 'ThreadManager.cpp',
    subtitle: 'Gestión de Hilos de Bajo Nivel',
    icon: <Cpu className="w-5 h-5" />,
    language: 'cpp',
    code: `// Implementación de ThreadPool con std::condition_variable
ThreadPool::ThreadPool(size_t numThreads) : stop(false) {
    for (size_t i = 0; i < numThreads; ++i) {
        workers.emplace_back([this] {
            for (;;) {
                std::function<void()> task;
                {
                    std::unique_lock<std::mutex> lock(this->queueMutex);
                    this->condition.wait(lock, [this] { 
                        return this->stop || !this->tasks.empty(); 
                    });
                    
                    if (this->stop && this->tasks.empty()) return;
                    task = std::move(this->tasks.front());
                    this->tasks.pop();
                }
                task(); // Ejecución concurrente del fragmento
            }
        });
    }
}`
  },
  {
    id: 'monitor',
    title: 'MetadataMonitor.cpp',
    subtitle: 'Patrón Monitor para Sincronización',
    icon: <Database className="w-5 h-5" />,
    language: 'cpp',
    code: `// Monitor que garantiza exclusión mutua en metadatos
bool MetadataMonitor::allocateSpace(size_t chunkSize, std::string& out_node_id) {
    std::lock_guard<std::mutex> lock(nodesMutex);
    
    std::string best_node_id = "";
    size_t max_free_space = 0;
    
    for (auto& pair : nodes) {
        Node& n = pair.second;
        size_t free_space = n.max_capacity - n.current_usage;
        
        if (free_space >= chunkSize && free_space > max_free_space) {
            best_node_id = n.id;
            max_free_space = free_space;
        }
    }
    
    if (best_node_id != "") {
        nodes[best_node_id].current_usage += chunkSize;
        out_node_id = best_node_id;
        return true;
    }
    return false;
}`
  },
  {
    id: 'chunking',
    title: 'ChunkManager.cpp',
    subtitle: 'Fragmentación y Distribución',
    icon: <Share2 className="w-5 h-5" />,
    language: 'cpp',
    code: `// Orquestación de fragmentación multihilo
void ChunkManager::processStream(std::istream& in, const std::string& file_id) {
    while (processed < total_size) {
        size_t current_chunk_size = std::min(chunk_size, total_size - processed);
        std::vector<char> buffer(current_chunk_size);
        in.read(buffer.data(), current_chunk_size);

        if (metadataMonitor.allocateSpace(current_chunk_size, node_id)) {
            // Encolar tarea en el ThreadPool
            threadPool.enqueue([this, file_id, node_id, buffer_moved = std::move(buffer)]() {
                saveToDisk(node_id, file_id, buffer_moved);
                this->metadataMonitor.notifyChunkWritten(file_id, node_id);
            });
        }
        processed += current_chunk_size;
    }
}`
  }
];

export default function CodeStack() {
  const [activeTab, setActiveTab] = useState(SNIPPETS[0].id);

  return (
    <section className="py-24 bg-neutral-950 border-y border-neutral-900">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row gap-12">
          {/* Left Side: Navigation */}
          <div className="md:w-1/3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono mb-6">
              <Code2 className="w-3 h-3" />
              <span>CORE ARCHITECTURE</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
              El Corazón del <span className="text-blue-500">DCFS</span>
            </h2>
            <p className="text-neutral-400 mb-8">
              Implementación nativa en C++ utilizando primitivas de concurrencia avanzadas para garantizar el rendimiento y la integridad de los datos.
            </p>

            <div className="space-y-3">
              {SNIPPETS.map((snippet) => (
                <button
                  key={snippet.id}
                  onClick={() => setActiveTab(snippet.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 border ${
                    activeTab === snippet.id
                      ? 'bg-neutral-900 border-neutral-800 text-white shadow-lg'
                      : 'bg-transparent border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${activeTab === snippet.id ? 'bg-blue-500 text-white' : 'bg-neutral-900'}`}>
                    {snippet.icon}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-sm">{snippet.title}</div>
                    <div className="text-xs opacity-60">{snippet.subtitle}</div>
                  </div>
                  <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${activeTab === snippet.id ? 'rotate-90' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Right Side: Code Display */}
          <div className="md:w-2/3">
            <div className="relative group">
              {/* Decorative elements */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
              
              <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
                {/* Window Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-neutral-950 border-b border-neutral-800">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/40"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/40"></div>
                  </div>
                  <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                    Source Code • {SNIPPETS.find(s => s.id === activeTab)?.language}
                  </div>
                </div>

                {/* Code Content */}
                <div className="p-6 overflow-x-auto min-h-[400px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <pre className="text-sm font-mono leading-relaxed text-neutral-300">
                        {SNIPPETS.find(s => s.id === activeTab)?.code.split('\n').map((line, i) => {
                          // Escapar HTML básico primero
                          let text = line
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;');

                          let highlighted = '';
                          
                          if (text.trim().startsWith('//')) {
                            highlighted = `<span class="text-emerald-500/80 italic">${text}</span>`;
                          } else {
                            // Una sola pasada para evitar recursión con "class", "std", etc.
                            const regex = /\b(void|bool|size_t|int|std|for|while|if|return|auto|const|this|new|class|private|public)\b|\b(ThreadPool|MetadataMonitor|ChunkManager|Node|ChunkMetadata)\b|("[^"]*")/g;
                            
                            highlighted = text.replace(regex, (match, p1, p2, p3) => {
                              if (p1) return `<span class="text-blue-400">${p1}</span>`;
                              if (p2) return `<span class="text-yellow-200">${p2}</span>`;
                              if (p3) return `<span class="text-emerald-300">${p3}</span>`;
                              return match;
                            });
                          }

                          return (
                            <code key={i} className="block whitespace-pre">
                              <span className="inline-block w-10 pr-6 text-neutral-600 text-right select-none">{i + 1}</span>
                              <span dangerouslySetInnerHTML={{ __html: highlighted }} />
                            </code>
                          );
                        })}
                      </pre>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
