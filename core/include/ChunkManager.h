#pragma once

#include "ThreadManager.h"
#include "MetadataMonitor.h"
#include <string>
#include <vector>
#include <memory>

class ChunkManager {
public:
    ChunkManager(ThreadPool& pool, MetadataMonitor& monitor);

    // Splits a file into chunks and enqueues tasks to write them.
    // Uses a dummy data buffer to simulate file data for the test.
    void processFile(const std::string& file_id, const std::string& filename, size_t total_size, size_t chunk_size);

private:
    ThreadPool& threadPool;
    MetadataMonitor& metadataMonitor;
};
