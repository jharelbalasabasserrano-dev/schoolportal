ALTER TABLE request_messages
    ADD COLUMN IF NOT EXISTS attachment_storage_path TEXT;

ALTER TABLE notification_reads
    ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT TRUE;
