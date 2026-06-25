ALTER TABLE request_messages
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Delivered' CHECK (status IN ('Sent', 'Delivered', 'Read')),
    ADD COLUMN IF NOT EXISTS read_by TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
