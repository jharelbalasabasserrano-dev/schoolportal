ALTER TABLE portal_requests
    ADD COLUMN IF NOT EXISTS reference_number TEXT,
    ADD COLUMN IF NOT EXISTS received_date DATE,
    ADD COLUMN IF NOT EXISTS received_time TEXT,
    ADD COLUMN IF NOT EXISTS received_by TEXT;

ALTER TABLE portal_requests
    DROP CONSTRAINT IF EXISTS portal_requests_reference_number_key;

DROP INDEX IF EXISTS portal_requests_reference_number_key;

CREATE SEQUENCE IF NOT EXISTS portal_requests_reference_number_seq;

CREATE OR REPLACE FUNCTION portal_request_reference_prefix(request_kind TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
    SELECT CASE
        WHEN request_kind IN (
            'Vacation Leave',
            'Mandatory/Forced Leave',
            'Sick Leave',
            'Maternity Leave',
            'Paternity Leave',
            'Special Privilege Leave',
            'Solo Parent Leave',
            'Study Leave',
            '10-Day VAWC Leave',
            'Rehabilitation Privilege',
            'Special Leave Benefits for Women',
            'Special Emergency (Calamity) Leave',
            'Adoption Leave',
            'Wellness Leave',
            'Other Leave',
            'Personal Leave',
            'Official Leave'
        ) THEN 'LV'
        WHEN request_kind = 'Facility Reservation' THEN 'FACILITY'
        WHEN request_kind IN ('Supply Request', 'Inventory Request') THEN 'SUPPLY'
        WHEN request_kind = 'Exit Clearance' THEN 'EXIT'
        WHEN request_kind IN (
            'TOR Request',
            'COE Request',
            'Certificate of Registration',
            'Certificate of Grades',
            'Certificate of Credit Units',
            'Change of Subject due to Conflict of Schedule',
            'Adding/Dropping of Subjects',
            'Other Registrar Request'
        ) THEN 'REG'
        ELSE 'REQ'
    END
$$;

CREATE OR REPLACE FUNCTION next_portal_request_reference_number(
    request_kind TEXT,
    requested_on DATE DEFAULT CURRENT_DATE
)
RETURNS TEXT
LANGUAGE PLPGSQL
AS $$
DECLARE
    candidate TEXT;
    reference_year TEXT;
BEGIN
    reference_year := COALESCE(EXTRACT(YEAR FROM requested_on)::INT, EXTRACT(YEAR FROM CURRENT_DATE)::INT)::TEXT;

    LOOP
        candidate := portal_request_reference_prefix(request_kind)
            || '-'
            || reference_year
            || '-'
            || LPAD(nextval('portal_requests_reference_number_seq')::TEXT, 6, '0');

        EXIT WHEN NOT EXISTS (
            SELECT 1
            FROM portal_requests
            WHERE reference_number = candidate
        );
    END LOOP;

    RETURN candidate;
END
$$;

DO $$
DECLARE
    blank_reference_count INTEGER;
    duplicate_reference_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO blank_reference_count
    FROM portal_requests
    WHERE reference_number IS NULL
       OR BTRIM(reference_number) = '';

    SELECT COALESCE(SUM(duplicate_count - 1), 0)::INTEGER
    INTO duplicate_reference_count
    FROM (
        SELECT COUNT(*) AS duplicate_count
        FROM portal_requests
        WHERE reference_number IS NOT NULL
          AND BTRIM(reference_number) <> ''
        GROUP BY reference_number
        HAVING COUNT(*) > 1
    ) duplicate_groups;

    RAISE NOTICE 'portal_requests.reference_number blanks: %, duplicate rows to repair: %',
        blank_reference_count,
        duplicate_reference_count;
END
$$;

UPDATE portal_requests
SET reference_number = NULL
WHERE reference_number IS NOT NULL
  AND BTRIM(reference_number) = '';

UPDATE portal_requests
SET reference_number = next_portal_request_reference_number(kind, request_date)
WHERE reference_number IS NULL;

WITH duplicate_references AS (
    SELECT id
    FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (
                PARTITION BY reference_number
                ORDER BY request_date, created_at, id
            ) AS duplicate_position
        FROM portal_requests
    ) numbered_requests
    WHERE duplicate_position > 1
)
UPDATE portal_requests
SET reference_number = next_portal_request_reference_number(kind, request_date)
FROM duplicate_references
WHERE portal_requests.id = duplicate_references.id;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM portal_requests
        WHERE reference_number IS NULL
           OR BTRIM(reference_number) = ''
    ) THEN
        RAISE EXCEPTION 'portal_requests.reference_number still contains NULL or blank values';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM portal_requests
        GROUP BY reference_number
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'portal_requests.reference_number still contains duplicate values';
    END IF;
END
$$;

CREATE UNIQUE INDEX portal_requests_reference_number_key
    ON portal_requests(reference_number);

CREATE OR REPLACE FUNCTION set_portal_request_reference_number()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
    IF NEW.kind IN (
        'Vacation Leave',
        'Mandatory/Forced Leave',
        'Sick Leave',
        'Maternity Leave',
        'Paternity Leave',
        'Special Privilege Leave',
        'Solo Parent Leave',
        'Study Leave',
        '10-Day VAWC Leave',
        'Rehabilitation Privilege',
        'Special Leave Benefits for Women',
        'Special Emergency (Calamity) Leave',
        'Adoption Leave',
        'Wellness Leave',
        'Other Leave',
        'Personal Leave',
        'Official Leave'
    )
    AND (NEW.reference_number IS NULL OR BTRIM(NEW.reference_number) = '') THEN
        NEW.reference_number := next_portal_request_reference_number(NEW.kind, NEW.request_date);
    END IF;

    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS set_portal_request_reference_number
    ON portal_requests;

CREATE TRIGGER set_portal_request_reference_number
    BEFORE INSERT OR UPDATE OF kind, reference_number, request_date
    ON portal_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_portal_request_reference_number();
