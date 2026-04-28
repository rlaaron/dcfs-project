-- Nodes table (simulated disks)
CREATE TABLE nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    folder_path TEXT NOT NULL UNIQUE,
    max_capacity BIGINT NOT NULL, -- in bytes
    current_usage BIGINT NOT NULL DEFAULT 0, -- in bytes
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Files table
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    total_size BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chunks table
CREATE TABLE chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE RESTRICT,
    chunk_index INT NOT NULL,
    size BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial nodes (simulated disks)
INSERT INTO nodes (name, folder_path, max_capacity) VALUES
('Disk 1', 'nodes/disk1', 104857600), -- 100 MB
('Disk 2', 'nodes/disk2', 104857600), -- 100 MB
('Disk 3', 'nodes/disk3', 104857600); -- 100 MB
