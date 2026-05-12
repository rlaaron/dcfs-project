cmake_minimum_required(VERSION 3.10)
project(DCFSCore)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED True)

# Add include directory
include_directories(include)

# Find threads
find_package(Threads REQUIRED)

# Source files
set(SOURCES_COMMON
    src/ThreadManager.cpp
    src/MetadataMonitor.cpp
    src/ChunkManager.cpp
)

# Executables
add_executable(dcfs_core_test ${SOURCES_COMMON} src/main_test.cpp)
add_executable(dcfs_core ${SOURCES_COMMON} src/main.cpp)

# Link threads
target_link_libraries(dcfs_core_test PRIVATE Threads::Threads)
target_link_libraries(dcfs_core PRIVATE Threads::Threads)
