ALTER TABLE request_messages
    ADD COLUMN IF NOT EXISTS attachment_data_url TEXT,
    ADD COLUMN IF NOT EXISTS attachment_name TEXT,
    ADD COLUMN IF NOT EXISTS attachment_size INTEGER,
    ADD COLUMN IF NOT EXISTS attachment_type TEXT;
