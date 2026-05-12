-- Create sessions table
CREATE TABLE sessions (
    pin TEXT PRIMARY KEY,
    nodes_count INT NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clean up existing data to migrate safely
DELETE FROM files;
DELETE FROM nodes;

-- Alter nodes table
ALTER TABLE nodes DROP CONSTRAINT nodes_name_key;
ALTER TABLE nodes DROP CONSTRAINT nodes_folder_path_key;
ALTER TABLE nodes ADD COLUMN session_pin TEXT REFERENCES sessions(pin) ON DELETE CASCADE;

-- Alter files table
ALTER TABLE files ADD COLUMN session_pin TEXT REFERENCES sessions(pin) ON DELETE CASCADE;
ALTER TABLE files ADD COLUMN nickname TEXT;
