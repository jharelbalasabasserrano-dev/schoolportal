ALTER TABLE portal_requests
    ADD COLUMN IF NOT EXISTS reference_number TEXT,
    ADD COLUMN IF NOT EXISTS received_date DATE,
    ADD COLUMN IF NOT EXISTS received_time TEXT,
    ADD COLUMN IF NOT EXISTS received_by TEXT;

UPDATE portal_requests
SET reference_number = 'LV-' || EXTRACT(YEAR FROM request_date)::text || '-' || RIGHT(LPAD(REGEXP_REPLACE(id, '\D', '', 'g'), 6, '0'), 6)
WHERE reference_number IS NULL
  AND id LIKE 'LV-%';

CREATE UNIQUE INDEX IF NOT EXISTS portal_requests_reference_number_key
    ON portal_requests(reference_number)
    WHERE reference_number IS NOT NULL;
