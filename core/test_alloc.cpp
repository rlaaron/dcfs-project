#include <iostream>
#include <string>
#include <vector>
#include <unordered_map>
#include <mutex>

struct Node {
    std::string id;
    std::string path;
    size_t max_capacity;
    size_t current_usage;
};

std::unordered_map<std::string, Node> nodes;
std::mutex nodesMutex;

bool allocateSpace(size_t chunkSize, std::string& out_node_id, std::string& out_node_path) {
    std::lock_guard<std::mutex> lock(nodesMutex);
    
    std::string best_node_id = "";
    size_t max_free_space = 0;
    
    for (auto& pair : nodes) {
        Node& n = pair.second;
        size_t free_space = n.max_capacity > n.current_usage ? n.max_capacity - n.current_usage : 0;
        
        std::cout << "Checking node " << n.id << " with free_space " << free_space << "\n";
        
        if (free_space >= chunkSize && free_space > max_free_space) {
            best_node_id = n.id;
            max_free_space = free_space;
            std::cout << "  New best node: " << best_node_id << " (max_free_space=" << max_free_space << ")\n";
        }
    }
    
    if (best_node_id != "") {
        Node& n = nodes[best_node_id];
        n.current_usage += chunkSize;
        out_node_id = n.id;
        out_node_path = n.path;
        return true;
    }
    
    return false;
}

int main() {
    nodes["disk1"] = {"disk1", "nodes/disk1", 104857600, 0};
    nodes["disk2"] = {"disk2", "nodes/disk2", 104857600, 0};
    nodes["disk3"] = {"disk3", "nodes/disk3", 104857600, 0};

    std::string out_id, out_path;
    allocateSpace(5242880, out_id, out_path);
    std::cout << "Allocated 1 to: " << out_id << "\n";

    allocateSpace(5242880, out_id, out_path);
    std::cout << "Allocated 2 to: " << out_id << "\n";

    allocateSpace(770788, out_id, out_path);
    std::cout << "Allocated 3 to: " << out_id << "\n";

    return 0;
}
