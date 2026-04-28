#pragma once

#include "ThreadManager.h"
#include "MetadataMonitor.h"
#include <string>
#include <vector>
#include <memory>
#include <istream>

class ChunkManager {
public:
    ChunkManager(ThreadPool& pool, MetadataMonitor& monitor);

    // Splits a stream into chunks and enqueues tasks to write them.
    void processStream(std::istream& in_stream, const std::string& file_id, const std::string& filename, size_t total_size, size_t chunk_size);

private:
    ThreadPool& threadPool;
    MetadataMonitor& metadataMonitor;
};
