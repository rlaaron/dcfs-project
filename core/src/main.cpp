#include "ThreadManager.h"
#include "MetadataMonitor.h"
#include "ChunkManager.h"
#include <iostream>
#include <vector>
#include <thread>
#include <chrono>
#include <string>

int main(int argc, char* argv[]) {
    if (argc < 5) {
        std::cerr << "Usage: dcfs_core <file_id> <filename> <total_size> <chunk_size>\n";
        return 1;
    }

    std::string file_id = argv[1];
    std::string filename = argv[2];
    size_t total_size = std::stoull(argv[3]);
    size_t chunk_size = std::stoull(argv[4]);

    // Initialize MetadataMonitor (simulated disks)
    MetadataMonitor monitor;
    std::vector<Node> initialNodes = {
        {"n1", "dcfs_storage/disk1", 100 * 1024 * 1024, 0}, // 100 MB
        {"n2", "dcfs_storage/disk2", 100 * 1024 * 1024, 0}, // 100 MB
        {"n3", "dcfs_storage/disk3", 100 * 1024 * 1024, 0}  // 100 MB
    };
    monitor.initNodes(initialNodes);

    // Initialize ThreadPool (4 worker threads for I/O)
    ThreadPool pool(4);

    // Initialize ChunkManager
    ChunkManager chunkManager(pool, monitor);

    // Read from std::cin
    chunkManager.processStream(std::cin, file_id, filename, total_size, chunk_size);

    // Wait for all chunk I/O tasks to complete
    pool.waitAll();

    // Wait for all metadata syncs to complete
    monitor.waitAllSyncs();

    std::cout << "SUCCESS\n";
    return 0;
}
