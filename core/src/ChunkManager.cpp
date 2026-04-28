#include "ChunkManager.h"
#include <iostream>
#include <fstream>
#include <filesystem>
#include <sys/stat.h>

ChunkManager::ChunkManager(ThreadPool& pool, MetadataMonitor& monitor)
    : threadPool(pool), metadataMonitor(monitor) {}

void ChunkManager::processFile(const std::string& file_id, const std::string& filename, size_t total_size, size_t chunk_size) {
    size_t processed = 0;
    int chunk_index = 0;

    while (processed < total_size) {
        size_t current_chunk_size = std::min(chunk_size, total_size - processed);
        
        std::string node_id;
        std::string node_path;

        if (metadataMonitor.allocateSpace(current_chunk_size, node_id, node_path)) {
            // Task to write the chunk
            int index = chunk_index; // Copy by value
            
            threadPool.enqueue([this, file_id, node_id, node_path, index, current_chunk_size]() {
                // Ensure directory exists
                std::filesystem::create_directories(node_path);

                std::string filepath = node_path + "/" + file_id + "_part" + std::to_string(index);
                
                // Simulate writing data
                std::ofstream ofs(filepath, std::ios::binary);
                if (ofs) {
                    // Create a dummy buffer of current_chunk_size
                    std::vector<char> buffer(current_chunk_size, 'A' + (index % 26));
                    ofs.write(buffer.data(), buffer.size());
                    ofs.close();

                    // Notify metadata monitor that it was successfully written
                    ChunkMetadata meta;
                    meta.file_id = file_id;
                    meta.node_id = node_id;
                    meta.chunk_index = index;
                    meta.size = current_chunk_size;
                    
                    this->metadataMonitor.notifyChunkWritten(meta);
                } else {
                    std::cerr << "Failed to open file for writing: " << filepath << std::endl;
                }
            });
        } else {
            std::cerr << "Error: No space left on any simulated disk for file " << file_id << " chunk " << chunk_index << "\n";
            // In a real system we would abort or retry later.
            break;
        }

        processed += current_chunk_size;
        chunk_index++;
    }
}
