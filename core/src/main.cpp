#include "ThreadManager.h"
#include "MetadataMonitor.h"
#include "ChunkManager.h"
#include <iostream>
#include <vector>
#include <thread>
#include <chrono>
#include <string>

int main(int argc, char* argv[]) {
    if (argc < 6) {
        std::cerr << "Usage: dcfs_core <file_id> <filename> <total_size> <chunk_size> <nodes...>\n";
        std::cerr << "Node format: id|path|max_capacity|current_usage\n";
        return 1;
    }

    std::string file_id = argv[1];
    std::string filename = argv[2];
    size_t total_size = std::stoull(argv[3]);
    size_t chunk_size = std::stoull(argv[4]);

    // Initialize MetadataMonitor (simulated disks)
    MetadataMonitor monitor;
    std::vector<Node> initialNodes;
    
    for (int i = 5; i < argc; ++i) {
        std::string node_str = argv[i];
        size_t p1 = node_str.find('|');
        size_t p2 = node_str.find('|', p1 + 1);
        size_t p3 = node_str.find('|', p2 + 1);
        
        if (p1 != std::string::npos && p2 != std::string::npos && p3 != std::string::npos) {
            Node n;
            n.id = node_str.substr(0, p1);
            n.path = node_str.substr(p1 + 1, p2 - p1 - 1);
            n.max_capacity = std::stoull(node_str.substr(p2 + 1, p3 - p2 - 1));
            n.current_usage = std::stoull(node_str.substr(p3 + 1));
            initialNodes.push_back(n);
        }
    }
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
