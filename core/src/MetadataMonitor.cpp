#include "MetadataMonitor.h"
#include <iostream>

MetadataMonitor::MetadataMonitor() : stopSyncThread(false), activeSyncs(0) {
    syncThread = std::thread(&MetadataMonitor::syncLoop, this);
}

MetadataMonitor::~MetadataMonitor() {
    {
        std::unique_lock<std::mutex> lock(queueMutex);
        stopSyncThread = true;
    }
    queueCondition.notify_all();
    if (syncThread.joinable()) {
        syncThread.join();
    }
}

void MetadataMonitor::initNodes(const std::vector<Node>& initialNodes) {
    std::lock_guard<std::mutex> lock(nodesMutex);
    for (const auto& n : initialNodes) {
        nodes[n.id] = n;
    }
}

bool MetadataMonitor::allocateSpace(size_t chunkSize, std::string& out_node_id, std::string& out_node_path) {
    std::lock_guard<std::mutex> lock(nodesMutex);
    for (auto& pair : nodes) {
        Node& n = pair.second;
        if (n.max_capacity - n.current_usage >= chunkSize) {
            // Reserve the space locally
            n.current_usage += chunkSize;
            out_node_id = n.id;
            out_node_path = n.path;
            return true;
        }
    }
    return false;
}

void MetadataMonitor::notifyChunkWritten(const ChunkMetadata& chunk) {
    {
        std::lock_guard<std::mutex> lock(queueMutex);
        pendingSyncs.push(chunk);
        activeSyncs++;
    }
    queueCondition.notify_one();
}

void MetadataMonitor::syncLoop() {
    for (;;) {
        ChunkMetadata chunk;
        {
            std::unique_lock<std::mutex> lock(queueMutex);
            queueCondition.wait(lock, [this] { return stopSyncThread || !pendingSyncs.empty(); });

            if (stopSyncThread && pendingSyncs.empty()) {
                return;
            }

            chunk = pendingSyncs.front();
            pendingSyncs.pop();
        }

        // --- OUTPUT TO STDOUT FOR BACKEND ---
        std::cout << "{\"event\":\"chunk_written\","
                  << "\"file_id\":\"" << chunk.file_id << "\","
                  << "\"node_id\":\"" << chunk.node_id << "\","
                  << "\"chunk_index\":" << chunk.chunk_index << ","
                  << "\"size\":" << chunk.size << "}\n" << std::flush;
        // --------------------------

        {
            std::lock_guard<std::mutex> lock(queueMutex);
            activeSyncs--;
            if (activeSyncs == 0 && pendingSyncs.empty()) {
                syncCompleteCondition.notify_all();
            }
        }
    }
}

void MetadataMonitor::waitAllSyncs() {
    std::unique_lock<std::mutex> lock(queueMutex);
    syncCompleteCondition.wait(lock, [this] {
        return activeSyncs == 0 && pendingSyncs.empty();
    });
}
