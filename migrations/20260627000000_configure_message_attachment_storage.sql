INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('message-attachments', 'message-attachments', false, 52428800, NULL)
ON CONFLICT (id) DO UPDATE
SET
    public = false,
    file_size_limit = 52428800,
    allowed_mime_types = NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'storage'
            AND tablename = 'objects'
            AND policyname = 'message_attachments_select'
    ) THEN
        CREATE POLICY message_attachments_select
            ON storage.objects
            FOR SELECT
            TO anon, authenticated
            USING (bucket_id = 'message-attachments');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'storage'
            AND tablename = 'objects'
            AND policyname = 'message_attachments_insert'
    ) THEN
        CREATE POLICY message_attachments_insert
            ON storage.objects
            FOR INSERT
            TO anon, authenticated
            WITH CHECK (bucket_id = 'message-attachments');
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'storage'
            AND tablename = 'objects'
            AND policyname = 'message_attachments_update'
    ) THEN
        CREATE POLICY message_attachments_update
            ON storage.objects
            FOR UPDATE
            TO anon, authenticated
            USING (bucket_id = 'message-attachments')
            WITH CHECK (bucket_id = 'message-attachments');
    END IF;
END
$$;
