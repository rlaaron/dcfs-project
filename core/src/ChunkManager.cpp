#include "ChunkManager.h"
#include <iostream>
#include <fstream>
#include <filesystem>
#include <sys/stat.h>

ChunkManager::ChunkManager(ThreadPool& pool, MetadataMonitor& monitor)
    : threadPool(pool), metadataMonitor(monitor) {}

void ChunkManager::processStream(std::istream& in_stream, const std::string& file_id, const std::string& filename, size_t total_size, size_t chunk_size) {
    size_t processed = 0;
    int chunk_index = 0;

    while (processed < total_size) {
        size_t current_chunk_size = std::min(chunk_size, total_size - processed);
        
        // Read data into memory (in a real high-perf system, we'd stream directly, but this is simpler)
        std::vector<char> buffer(current_chunk_size);
        in_stream.read(buffer.data(), current_chunk_size);
        size_t bytes_read = in_stream.gcount();
        
        if (bytes_read == 0) break;
        buffer.resize(bytes_read); // In case we read less than expected

        std::string node_id;
        std::string node_path;

        if (metadataMonitor.allocateSpace(bytes_read, node_id, node_path)) {
            int index = chunk_index; // Copy by value
            
            // We move the buffer into the lambda to avoid copy and lifetime issues
            threadPool.enqueue([this, file_id, node_id, node_path, index, buffer_moved = std::move(buffer)]() {
                std::filesystem::create_directories(node_path);
                std::string filepath = node_path + "/" + file_id + "_part" + std::to_string(index);
                
                std::ofstream ofs(filepath, std::ios::binary);
                if (ofs) {
                    ofs.write(buffer_moved.data(), buffer_moved.size());
                    ofs.close();

                    ChunkMetadata meta;
                    meta.file_id = file_id;
                    meta.node_id = node_id;
                    meta.chunk_index = index;
                    meta.size = buffer_moved.size();
                    
                    this->metadataMonitor.notifyChunkWritten(meta);
                } else {
                    std::cerr << "Failed to open file for writing: " << filepath << std::endl;
                }
            });
        } else {
            std::cerr << "Error: No space left on any simulated disk for file " << file_id << " chunk " << chunk_index << "\n";
            break;
        }

        processed += bytes_read;
        chunk_index++;
    }
}
