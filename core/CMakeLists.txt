cmake_minimum_required(VERSION 3.10)
project(DCFSCore)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED True)

# Add include directory
include_directories(include)

# Find threads
find_package(Threads REQUIRED)

# Source files
set(SOURCES
    src/ThreadManager.cpp
    src/MetadataMonitor.cpp
    src/ChunkManager.cpp
    src/main_test.cpp
)

# Executable
add_executable(dcfs_core_test ${SOURCES})

# Link threads
target_link_libraries(dcfs_core_test PRIVATE Threads::Threads)
