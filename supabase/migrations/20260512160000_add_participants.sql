-- Create participants table to track users before they upload files
CREATE TABLE participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_pin TEXT NOT NULL REFERENCES sessions(pin) ON DELETE CASCADE,
    nickname TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_pin, nickname)
);

-- Enable Realtime for participants
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
