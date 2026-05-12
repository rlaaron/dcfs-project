-- Create a function to decrement node usage
CREATE OR REPLACE FUNCTION decrement_node_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE nodes
    SET current_usage = current_usage - OLD.size
    WHERE id = OLD.node_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on the chunks table
CREATE TRIGGER on_chunk_delete
AFTER DELETE ON chunks
FOR EACH ROW
EXECUTE FUNCTION decrement_node_usage();
