#pragma once

#include <string>
#include <vector>
#include <map>
#include <mutex>
#include <condition_variable>
#include <thread>
#include <queue>

struct Node {
    std::string id;
    std::string path;
    size_t max_capacity;
    size_t current_usage;
};

struct ChunkMetadata {
    std::string file_id;
    std::string node_id;
    int chunk_index;
    size_t size;
};

class MetadataMonitor {
public:
    MetadataMonitor();
    ~MetadataMonitor();

    // Initialize the simulated disks
    void initNodes(const std::vector<Node>& initialNodes);

    // Allocates space on a simulated disk. Returns true if successful.
    bool allocateSpace(size_t chunkSize, std::string& out_node_id, std::string& out_node_path);

    // Called by worker threads when a chunk is successfully written to disk.
    // This acts as the producer in our monitor.
    void notifyChunkWritten(const ChunkMetadata& chunk);

    // Wait until all pending metadata syncs are completed
    void waitAllSyncs();

private:
    // Consumer loop that syncs with Supabase (mocked for now)
    void syncLoop();

    std::map<std::string, Node> nodes;
    std::mutex nodesMutex;

    std::queue<ChunkMetadata> pendingSyncs;
    std::mutex queueMutex;
    std::condition_variable queueCondition;
    bool stopSyncThread;

    std::thread syncThread;

    // For waitAllSyncs
    std::condition_variable syncCompleteCondition;
    int activeSyncs;
};
