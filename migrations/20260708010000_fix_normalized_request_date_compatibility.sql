DO $$
BEGIN
    IF to_regclass('public.portal_requests') IS NOT NULL THEN
        ALTER TABLE public.portal_requests
            ADD COLUMN IF NOT EXISTS request_date DATE,
            ADD COLUMN IF NOT EXISTS request_time TEXT;

        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'portal_requests'
              AND column_name = 'date'
        ) THEN
            EXECUTE '
                UPDATE public.portal_requests
                SET request_date = COALESCE(request_date, NULLIF("date"::text, '''')::date)
                WHERE request_date IS NULL
            ';
        END IF;

        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'portal_requests'
              AND column_name = 'time'
        ) THEN
            EXECUTE '
                UPDATE public.portal_requests
                SET request_time = COALESCE(request_time, NULLIF("time"::text, ''''))
                WHERE request_time IS NULL
            ';
        END IF;

        UPDATE public.portal_requests
        SET
            request_date = COALESCE(request_date, CURRENT_DATE),
            request_time = COALESCE(request_time, '');
    END IF;
END
$$;

DO $$
BEGIN
    IF to_regclass('public.request_records') IS NOT NULL THEN
        ALTER TABLE public.request_records
            ADD COLUMN IF NOT EXISTS request_date DATE,
            ADD COLUMN IF NOT EXISTS request_time TEXT;

        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'request_records'
              AND column_name = 'date'
        ) THEN
            EXECUTE '
                UPDATE public.request_records
                SET request_date = COALESCE(request_date, NULLIF("date"::text, '''')::date)
                WHERE request_date IS NULL
            ';
        END IF;

        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'request_records'
              AND column_name = 'time'
        ) THEN
            EXECUTE '
                UPDATE public.request_records
                SET request_time = COALESCE(request_time, NULLIF("time"::text, ''''))
                WHERE request_time IS NULL
            ';
        END IF;

        UPDATE public.request_records
        SET
            request_date = COALESCE(request_date, CURRENT_DATE),
            request_time = COALESCE(request_time, '');

        ALTER TABLE public.request_records
            ALTER COLUMN request_date SET NOT NULL,
            ALTER COLUMN request_time SET NOT NULL;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS request_records_request_date_idx ON request_records(request_date DESC);

DROP VIEW IF EXISTS portal_request_details;

CREATE VIEW portal_request_details AS
SELECT
    rr.id,
    rr.title,
    rr.kind,
    COALESCE(rr.owner_id, '') AS owner_id,
    rr.owner_name AS owner,
    rr.office_name AS office,
    rr.status,
    rr.request_date::text AS date,
    rr.request_time AS time,
    rr.remarks,
    fr.facility,
    fr.attendees,
    COALESCE(fr.purpose, sr.purpose, reg.purpose) AS purpose,
    fr.remarks AS facility_remarks,
    reg.student_id,
    reg.year_level,
    reg.semester,
    reg.school_year,
    reg.program,
    reg.major,
    reg.transfer_reason,
    reg.requested_docs,
    reg.claim_release_date,
    rr.reference_number,
    rr.received_date::text AS received_date,
    rr.received_time,
    rr.received_by,
    rr.released_by,
    lr.position,
    lr.salary,
    lr.working_days::float8 AS working_days,
    lr.inclusive_dates,
    lr.communication,
    lr.leave_detail,
    lr.leave_vacation_location,
    lr.leave_vacation_specify,
    lr.leave_sick_location,
    lr.leave_sick_illness,
    lr.leave_women_illness,
    lr.leave_study_purpose,
    lr.leave_other_purpose,
    lr.custom_leave_type,
    lr.leave_duration,
    lr.leave_time,
    lr.filing_date::text AS filing_date,
    lr.leave_start_date::text AS leave_start_date,
    lr.leave_end_date::text AS leave_end_date,
    lb.vacation_leave_earned,
    lb.vacation_leave_less,
    lb.vacation_leave_balance,
    lb.sick_leave_earned,
    lb.sick_leave_less,
    lb.sick_leave_balance,
    la.hr_recommendation,
    la.approved_for,
    la.disapproved_due_to,
    lr.hr_remarks,
    rr.updated_by
FROM request_records rr
LEFT JOIN registrar_requests reg ON reg.request_id = rr.id
LEFT JOIN leave_requests lr ON lr.request_id = rr.id
LEFT JOIN leave_balances lb ON lb.request_id = rr.id
LEFT JOIN leave_approvals la ON la.request_id = rr.id
LEFT JOIN supply_requests sr ON sr.request_id = rr.id
LEFT JOIN facility_requests fr ON fr.request_id = rr.id;

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    IF to_regclass('public.request_messages') IS NOT NULL
       AND to_regclass('public.request_records') IS NOT NULL THEN
        FOR constraint_name IN
            SELECT con.conname
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
            WHERE nsp.nspname = 'public'
              AND rel.relname = 'request_messages'
              AND con.contype = 'f'
              AND pg_get_constraintdef(con.oid) LIKE '%request_id%'
        LOOP
            EXECUTE format('ALTER TABLE public.request_messages DROP CONSTRAINT %I', constraint_name);
        END LOOP;

        ALTER TABLE public.request_messages
            ADD CONSTRAINT request_messages_request_id_fkey
            FOREIGN KEY (request_id) REFERENCES public.request_records(id) ON DELETE CASCADE
            NOT VALID;
    END IF;
END
$$;
