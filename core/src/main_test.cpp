#include "ThreadManager.h"
#include "MetadataMonitor.h"
#include "ChunkManager.h"
#include <iostream>
#include <vector>
#include <thread>
#include <chrono>

int main() {
    std::cout << "Starting DCFS Core Engine Test...\n";

    // Initialize MetadataMonitor (simulated disks)
    MetadataMonitor monitor;
    std::vector<Node> initialNodes = {
        {"n1", "dcfs_storage/disk1", 100 * 1024 * 1024, 0}, // 100 MB
        {"n2", "dcfs_storage/disk2", 100 * 1024 * 1024, 0}, // 100 MB
        {"n3", "dcfs_storage/disk3", 100 * 1024 * 1024, 0}  // 100 MB
    };
    monitor.initNodes(initialNodes);

    // Initialize ThreadPool (e.g., 4 worker threads for I/O)
    ThreadPool pool(4);

    // Initialize ChunkManager
    ChunkManager chunkManager(pool, monitor);

    // Spawn 10 concurrent client threads
    std::vector<std::thread> clients;
    for (int i = 0; i < 10; ++i) {
        clients.emplace_back([i, &chunkManager]() {
            std::string file_id = "file_" + std::to_string(i);
            std::string filename = "test_file_" + std::to_string(i) + ".bin";
            size_t file_size = 15 * 1024 * 1024; // 15 MB
            size_t chunk_size = 5 * 1024 * 1024; // 5 MB chunks

            std::cout << "Client " << i << " started uploading " << filename << "\n";
            
            // This will enqueue tasks to the ThreadPool
            chunkManager.processFile(file_id, filename, file_size, chunk_size);
            
            std::cout << "Client " << i << " finished enqueuing tasks.\n";
        });
    }

    // Wait for all client threads to finish enqueuing
    for (auto& client : clients) {
        client.join();
    }

    // Wait for all worker threads to finish processing chunks
    std::cout << "Waiting for all chunk I/O tasks to complete...\n";
    pool.waitAll();

    // Wait for all metadata syncs to complete
    std::cout << "Waiting for metadata sync to complete...\n";
    monitor.waitAllSyncs();

    std::cout << "All files successfully processed and synced!\n";
    return 0;
}
