DO $$
DECLARE
    duplicate_emails TEXT;
BEGIN
    SELECT string_agg(email_key || ' (' || duplicate_count || ')', ', ')
    INTO duplicate_emails
    FROM (
        SELECT lower(email) AS email_key, COUNT(*) AS duplicate_count
        FROM app_users
        GROUP BY lower(email)
        HAVING COUNT(*) > 1
        ORDER BY lower(email)
    ) duplicates;

    IF duplicate_emails IS NOT NULL THEN
        RAISE EXCEPTION 'Duplicate app_users emails must be resolved before authentication can start: %', duplicate_emails;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_lower_unique
ON app_users (lower(email));
