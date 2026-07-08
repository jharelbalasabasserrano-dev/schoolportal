CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS programs (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    department_id TEXT REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS offices (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS status_types (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    module TEXT NOT NULL DEFAULT 'shared'
);

CREATE TABLE IF NOT EXISTS request_types (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    module TEXT NOT NULL,
    office_id TEXT REFERENCES offices(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS school_years (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS semesters (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS leave_types (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

INSERT INTO offices (id, name) VALUES
    ('registrar', 'Registrar'),
    ('supply', 'Supply Office'),
    ('admin-office', 'Admin Office'),
    ('hr', 'HR Office')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO status_types (id, name, module) VALUES
    ('pending', 'Pending', 'shared'),
    ('approved', 'Approved', 'shared'),
    ('disapproved', 'Disapproved', 'shared'),
    ('completed', 'Completed', 'shared'),
    ('on-process', 'On Process', 'registrar'),
    ('ready-for-pick-up', 'Ready for Pick Up', 'registrar')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, module = EXCLUDED.module;

INSERT INTO request_types (id, name, module, office_id) VALUES
    ('tor-request', 'TOR Request', 'registrar', 'registrar'),
    ('coe-request', 'COE Request', 'registrar', 'registrar'),
    ('exit-clearance', 'Exit Clearance', 'student', 'registrar'),
    ('certificate-of-registration', 'Certificate of Registration', 'registrar', 'registrar'),
    ('certificate-of-grades', 'Certificate of Grades', 'registrar', 'registrar'),
    ('certificate-of-credit-units', 'Certificate of Credit Units', 'registrar', 'registrar'),
    ('subject-change-conflict', 'Change of Subject due to Conflict of Schedule', 'student', 'registrar'),
    ('adding-dropping-subjects', 'Adding/Dropping of Subjects', 'student', 'registrar'),
    ('other-registrar-request', 'Other Registrar Request', 'registrar', 'registrar'),
    ('supply-request', 'Supply Request', 'supply', 'supply'),
    ('inventory-request', 'Inventory Request', 'supply', 'supply'),
    ('vacation-leave', 'Vacation Leave', 'hr', 'hr'),
    ('mandatory-forced-leave', 'Mandatory/Forced Leave', 'hr', 'hr'),
    ('sick-leave', 'Sick Leave', 'hr', 'hr'),
    ('maternity-leave', 'Maternity Leave', 'hr', 'hr'),
    ('paternity-leave', 'Paternity Leave', 'hr', 'hr'),
    ('special-privilege-leave', 'Special Privilege Leave', 'hr', 'hr'),
    ('solo-parent-leave', 'Solo Parent Leave', 'hr', 'hr'),
    ('study-leave', 'Study Leave', 'hr', 'hr'),
    ('vawc-leave', '10-Day VAWC Leave', 'hr', 'hr'),
    ('rehabilitation-privilege', 'Rehabilitation Privilege', 'hr', 'hr'),
    ('special-leave-benefits-women', 'Special Leave Benefits for Women', 'hr', 'hr'),
    ('special-emergency-calamity-leave', 'Special Emergency (Calamity) Leave', 'hr', 'hr'),
    ('adoption-leave', 'Adoption Leave', 'hr', 'hr'),
    ('wellness-leave', 'Wellness Leave', 'hr', 'hr'),
    ('other-leave', 'Other Leave', 'hr', 'hr'),
    ('personal-leave', 'Personal Leave', 'hr', 'hr'),
    ('official-leave', 'Official Leave', 'hr', 'hr'),
    ('facility-reservation', 'Facility Reservation', 'facility', 'admin-office')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, module = EXCLUDED.module, office_id = EXCLUDED.office_id;

INSERT INTO leave_types (id, name)
SELECT id, name
FROM request_types
WHERE module = 'hr'
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

CREATE TABLE IF NOT EXISTS student_profiles (
    user_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    student_id TEXT,
    program_id TEXT REFERENCES programs(id) ON DELETE SET NULL,
    year_level TEXT,
    semester_id TEXT REFERENCES semesters(id) ON DELETE SET NULL,
    school_year_id TEXT REFERENCES school_years(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_profiles (
    user_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    employee_number TEXT,
    position TEXT,
    department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS registrar_profiles (
    user_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
    can_release_documents BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_profiles (
    user_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
    can_approve_leave BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supply_profiles (
    user_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
    can_manage_inventory BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_office_profiles (
    user_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
    can_manage_facilities BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_admin_profiles (
    user_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
    can_manage_system BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO departments (id, name)
SELECT normalized.id, MIN(normalized.name) AS name
FROM (
    SELECT
        lower(regexp_replace(department, '[^a-zA-Z0-9]+', '-', 'g')) AS id,
        BTRIM(department) AS name
    FROM app_users
    WHERE NULLIF(BTRIM(department), '') IS NOT NULL
) normalized
GROUP BY normalized.id
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO student_profiles (user_id)
SELECT id FROM app_users WHERE role = 'student'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO employee_profiles (user_id, department_id)
SELECT id, lower(regexp_replace(department, '[^a-zA-Z0-9]+', '-', 'g'))
FROM app_users
WHERE role = 'employee'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO registrar_profiles (user_id, department_id)
SELECT id, lower(regexp_replace(department, '[^a-zA-Z0-9]+', '-', 'g'))
FROM app_users
WHERE role = 'registrar'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO hr_profiles (user_id, department_id)
SELECT id, lower(regexp_replace(department, '[^a-zA-Z0-9]+', '-', 'g'))
FROM app_users
WHERE role = 'hr'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO supply_profiles (user_id, department_id)
SELECT id, lower(regexp_replace(department, '[^a-zA-Z0-9]+', '-', 'g'))
FROM app_users
WHERE role = 'supply'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO admin_office_profiles (user_id, department_id)
SELECT id, lower(regexp_replace(department, '[^a-zA-Z0-9]+', '-', 'g'))
FROM app_users
WHERE role = 'adminOffice'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO system_admin_profiles (user_id, department_id)
SELECT id, lower(regexp_replace(department, '[^a-zA-Z0-9]+', '-', 'g'))
FROM app_users
WHERE role = 'admin'
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION sync_app_user_profile()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
DECLARE
    normalized_department_id TEXT;
BEGIN
    IF NULLIF(BTRIM(NEW.department), '') IS NOT NULL THEN
        normalized_department_id := lower(regexp_replace(NEW.department, '[^a-zA-Z0-9]+', '-', 'g'));

        INSERT INTO departments (id, name)
        VALUES (normalized_department_id, NEW.department)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    END IF;

    IF NEW.role <> 'student' THEN
        DELETE FROM student_profiles WHERE user_id = NEW.id;
    END IF;
    IF NEW.role <> 'employee' THEN
        DELETE FROM employee_profiles WHERE user_id = NEW.id;
    END IF;
    IF NEW.role <> 'registrar' THEN
        DELETE FROM registrar_profiles WHERE user_id = NEW.id;
    END IF;
    IF NEW.role <> 'hr' THEN
        DELETE FROM hr_profiles WHERE user_id = NEW.id;
    END IF;
    IF NEW.role <> 'supply' THEN
        DELETE FROM supply_profiles WHERE user_id = NEW.id;
    END IF;
    IF NEW.role <> 'adminOffice' THEN
        DELETE FROM admin_office_profiles WHERE user_id = NEW.id;
    END IF;
    IF NEW.role <> 'admin' THEN
        DELETE FROM system_admin_profiles WHERE user_id = NEW.id;
    END IF;

    IF NEW.role = 'student' THEN
        INSERT INTO student_profiles (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW();
    ELSIF NEW.role = 'employee' THEN
        INSERT INTO employee_profiles (user_id, department_id)
        VALUES (NEW.id, normalized_department_id)
        ON CONFLICT (user_id) DO UPDATE SET department_id = EXCLUDED.department_id, updated_at = NOW();
    ELSIF NEW.role = 'registrar' THEN
        INSERT INTO registrar_profiles (user_id, department_id)
        VALUES (NEW.id, normalized_department_id)
        ON CONFLICT (user_id) DO UPDATE SET department_id = EXCLUDED.department_id, updated_at = NOW();
    ELSIF NEW.role = 'hr' THEN
        INSERT INTO hr_profiles (user_id, department_id)
        VALUES (NEW.id, normalized_department_id)
        ON CONFLICT (user_id) DO UPDATE SET department_id = EXCLUDED.department_id, updated_at = NOW();
    ELSIF NEW.role = 'supply' THEN
        INSERT INTO supply_profiles (user_id, department_id)
        VALUES (NEW.id, normalized_department_id)
        ON CONFLICT (user_id) DO UPDATE SET department_id = EXCLUDED.department_id, updated_at = NOW();
    ELSIF NEW.role = 'adminOffice' THEN
        INSERT INTO admin_office_profiles (user_id, department_id)
        VALUES (NEW.id, normalized_department_id)
        ON CONFLICT (user_id) DO UPDATE SET department_id = EXCLUDED.department_id, updated_at = NOW();
    ELSIF NEW.role = 'admin' THEN
        INSERT INTO system_admin_profiles (user_id, department_id)
        VALUES (NEW.id, normalized_department_id)
        ON CONFLICT (user_id) DO UPDATE SET department_id = EXCLUDED.department_id, updated_at = NOW();
    END IF;

    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS sync_app_user_profile ON app_users;

CREATE TRIGGER sync_app_user_profile
    AFTER INSERT OR UPDATE OF role, department
    ON app_users
    FOR EACH ROW
    EXECUTE FUNCTION sync_app_user_profile();

CREATE TABLE IF NOT EXISTS request_records (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    request_type_id TEXT REFERENCES request_types(id) ON DELETE SET NULL,
    kind TEXT NOT NULL,
    owner_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
    owner_name TEXT NOT NULL,
    office_id TEXT REFERENCES offices(id) ON DELETE SET NULL,
    office_name TEXT NOT NULL,
    status_type_id TEXT REFERENCES status_types(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    request_date DATE NOT NULL,
    request_time TEXT NOT NULL,
    remarks TEXT NOT NULL DEFAULT '',
    reference_number TEXT UNIQUE,
    received_date DATE,
    received_time TEXT,
    received_by TEXT,
    released_by TEXT,
    updated_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS request_records_owner_id_idx ON request_records(owner_id);
CREATE INDEX IF NOT EXISTS request_records_request_type_id_idx ON request_records(request_type_id);
CREATE INDEX IF NOT EXISTS request_records_office_id_idx ON request_records(office_id);
CREATE INDEX IF NOT EXISTS request_records_status_type_id_idx ON request_records(status_type_id);
CREATE INDEX IF NOT EXISTS request_records_request_date_idx ON request_records(request_date DESC);

CREATE TABLE IF NOT EXISTS registrar_requests (
    request_id TEXT PRIMARY KEY REFERENCES request_records(id) ON DELETE CASCADE,
    student_id TEXT,
    program TEXT,
    major TEXT,
    year_level TEXT,
    semester TEXT,
    school_year TEXT,
    purpose TEXT,
    transfer_reason TEXT,
    requested_docs TEXT[],
    claim_release_date TEXT
);

CREATE TABLE IF NOT EXISTS certificate_requests (
    request_id TEXT PRIMARY KEY REFERENCES request_records(id) ON DELETE CASCADE,
    certificate_kind TEXT NOT NULL,
    purpose TEXT,
    copies INTEGER CHECK (copies IS NULL OR copies > 0)
);

CREATE TABLE IF NOT EXISTS subject_change_requests (
    request_id TEXT PRIMARY KEY REFERENCES request_records(id) ON DELETE CASCADE,
    student_id TEXT,
    program TEXT,
    year_level TEXT,
    semester TEXT,
    school_year TEXT,
    reason TEXT
);

CREATE TABLE IF NOT EXISTS add_drop_requests (
    request_id TEXT PRIMARY KEY REFERENCES request_records(id) ON DELETE CASCADE,
    student_id TEXT,
    program TEXT,
    year_level TEXT,
    semester TEXT,
    school_year TEXT,
    reason TEXT
);

ALTER TABLE exit_clearance_requests
    ADD COLUMN IF NOT EXISTS request_id TEXT UNIQUE;

ALTER TABLE exit_clearance_requests
    DROP CONSTRAINT IF EXISTS exit_clearance_requests_request_id_fkey;

ALTER TABLE exit_clearance_requests
    ADD CONSTRAINT exit_clearance_requests_request_id_fkey
    FOREIGN KEY (request_id) REFERENCES request_records(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS exit_clearance_requests_request_id_idx ON exit_clearance_requests(request_id);

CREATE TABLE IF NOT EXISTS tor_requests (
    request_id TEXT PRIMARY KEY REFERENCES request_records(id) ON DELETE CASCADE,
    student_id TEXT,
    program TEXT,
    year_level TEXT,
    semester TEXT,
    school_year TEXT,
    purpose TEXT
);

CREATE TABLE IF NOT EXISTS coe_requests (
    request_id TEXT PRIMARY KEY REFERENCES request_records(id) ON DELETE CASCADE,
    student_id TEXT,
    program TEXT,
    year_level TEXT,
    semester TEXT,
    school_year TEXT,
    purpose TEXT
);

CREATE TABLE IF NOT EXISTS cor_requests (
    request_id TEXT PRIMARY KEY REFERENCES request_records(id) ON DELETE CASCADE,
    student_id TEXT,
    program TEXT,
    year_level TEXT,
    semester TEXT,
    school_year TEXT,
    purpose TEXT
);

CREATE TABLE IF NOT EXISTS certificate_of_grades_requests (
    request_id TEXT PRIMARY KEY REFERENCES request_records(id) ON DELETE CASCADE,
    student_id TEXT,
    program TEXT,
    year_level TEXT,
    semester TEXT,
    school_year TEXT,
    purpose TEXT
);

CREATE TABLE IF NOT EXISTS certificate_credit_units_requests (
    request_id TEXT PRIMARY KEY REFERENCES request_records(id) ON DELETE CASCADE,
    student_id TEXT,
    program TEXT,
    year_level TEXT,
    semester TEXT,
    school_year TEXT,
    purpose TEXT
);

CREATE TABLE IF NOT EXISTS registrar_other_requests (
    request_id TEXT PRIMARY KEY REFERENCES request_records(id) ON DELETE CASCADE,
    student_id TEXT,
    program TEXT,
    year_level TEXT,
    semester TEXT,
    school_year TEXT,
    purpose TEXT
);

CREATE TABLE IF NOT EXISTS leave_requests (
    request_id TEXT PRIMARY KEY REFERENCES request_records(id) ON DELETE CASCADE,
    leave_type_id TEXT REFERENCES leave_types(id) ON DELETE SET NULL,
    leave_type TEXT NOT NULL,
    filing_date DATE,
    leave_start_date DATE,
    leave_end_date DATE,
    working_days NUMERIC,
    leave_duration TEXT,
    leave_time TEXT,
    inclusive_dates TEXT,
    communication TEXT,
    leave_detail TEXT,
    leave_vacation_location TEXT,
    leave_vacation_specify TEXT,
    leave_sick_location TEXT,
    leave_sick_illness TEXT,
    leave_women_illness TEXT,
    leave_study_purpose TEXT,
    leave_other_purpose TEXT,
    custom_leave_type TEXT,
    position TEXT,
    salary TEXT,
    hr_remarks TEXT
);

CREATE INDEX IF NOT EXISTS leave_requests_leave_type_id_idx ON leave_requests(leave_type_id);

CREATE TABLE IF NOT EXISTS leave_balances (
    request_id TEXT PRIMARY KEY REFERENCES leave_requests(request_id) ON DELETE CASCADE,
    vacation_leave_earned TEXT,
    vacation_leave_less TEXT,
    vacation_leave_balance TEXT,
    sick_leave_earned TEXT,
    sick_leave_less TEXT,
    sick_leave_balance TEXT
);

CREATE TABLE IF NOT EXISTS leave_approvals (
    request_id TEXT PRIMARY KEY REFERENCES leave_requests(request_id) ON DELETE CASCADE,
    hr_recommendation TEXT,
    approved_for TEXT,
    disapproved_due_to TEXT
);

CREATE TABLE IF NOT EXISTS supply_requests (
    request_id TEXT PRIMARY KEY REFERENCES request_records(id) ON DELETE CASCADE,
    purpose TEXT,
    requested_by TEXT,
    department TEXT
);

CREATE TABLE IF NOT EXISTS facility_requests (
    request_id TEXT PRIMARY KEY REFERENCES request_records(id) ON DELETE CASCADE,
    facility TEXT NOT NULL,
    attendees INTEGER CHECK (attendees IS NULL OR attendees > 0),
    purpose TEXT,
    remarks TEXT,
    status TEXT
);

CREATE TABLE IF NOT EXISTS facility_reservations (
    request_id TEXT PRIMARY KEY REFERENCES facility_requests(request_id) ON DELETE CASCADE,
    facility TEXT NOT NULL,
    reservation_date DATE NOT NULL,
    attendees INTEGER CHECK (attendees IS NULL OR attendees > 0),
    purpose TEXT,
    remarks TEXT,
    status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS message_attachments (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL REFERENCES request_messages(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL CHECK (file_size >= 0),
    file_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS message_attachments_message_id_idx ON message_attachments(message_id);

CREATE TABLE IF NOT EXISTS message_reads (
    message_id TEXT NOT NULL REFERENCES request_messages(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS message_reads_user_id_idx ON message_reads(user_id);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES app_users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at DESC);

INSERT INTO notifications (id, user_id, title, body, kind, created_at)
VALUES
    ('tor-approved', NULL, 'TOR Request Approved', 'Your TOR request (DR-2026-001) has been approved. Please pick it up at Registrar Window 3.', 'approval', '2026-05-15 18:11:00+08'),
    ('facility-approved', NULL, 'Facility Reservation Approved', 'AVR 2 reservation on June 10 has been confirmed.', 'approval', '2026-05-26 17:00:00+08'),
    ('coe-disapproved', NULL, 'COE Request Disapproved', 'Your COE request was disapproved. Reason: please re-submit with correct semester indicated.', 'disapproval', '2026-03-04 17:46:00+08'),
    ('exam-schedule', NULL, 'Final Exam Schedule Released', 'Check the academic calendar for the updated final examinations schedule.', 'announcement', '2026-05-20 15:30:00+08'),
    ('enrollment-reminder', NULL, 'Reminder: Enrollment Period', 'Online enrollment for 1st Semester AY 2026-2027 opens on June 22.', 'info', '2026-05-29 23:00:00+08')
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    body = EXCLUDED.body,
    kind = EXCLUDED.kind,
    created_at = EXCLUDED.created_at;

ALTER TABLE notification_reads
    ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'notification_reads_notification_id_fkey'
          AND conrelid = 'notification_reads'::regclass
    ) THEN
        ALTER TABLE notification_reads
            ADD CONSTRAINT notification_reads_notification_id_fkey
            FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
            NOT VALID;
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS announcement_reads (
    announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS announcement_reads_user_id_idx ON announcement_reads(user_id);

INSERT INTO programs (id, name)
SELECT normalized.id, MIN(normalized.name) AS name
FROM (
    SELECT
        lower(regexp_replace(program, '[^a-zA-Z0-9]+', '-', 'g')) AS id,
        BTRIM(program) AS name
    FROM portal_requests
    WHERE NULLIF(BTRIM(program), '') IS NOT NULL
) normalized
GROUP BY normalized.id
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO school_years (id, name)
SELECT normalized.id, MIN(normalized.name) AS name
FROM (
    SELECT
        lower(regexp_replace(school_year, '[^a-zA-Z0-9]+', '-', 'g')) AS id,
        BTRIM(school_year) AS name
    FROM portal_requests
    WHERE NULLIF(BTRIM(school_year), '') IS NOT NULL
) normalized
GROUP BY normalized.id
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO semesters (id, name)
SELECT normalized.id, MIN(normalized.name) AS name
FROM (
    SELECT
        lower(regexp_replace(semester, '[^a-zA-Z0-9]+', '-', 'g')) AS id,
        BTRIM(semester) AS name
    FROM portal_requests
    WHERE NULLIF(BTRIM(semester), '') IS NOT NULL
) normalized
GROUP BY normalized.id
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO request_records (
    id, title, request_type_id, kind, owner_id, owner_name, office_id, office_name,
    status_type_id, status, request_date, request_time, remarks, reference_number,
    received_date, received_time, received_by, released_by, updated_by, created_at, updated_at
)
SELECT
    pr.id,
    pr.title,
    rt.id,
    pr.kind,
    pr.owner_id,
    pr.owner,
    o.id,
    pr.office,
    st.id,
    pr.status,
    pr.request_date,
    pr.request_time,
    pr.remarks,
    pr.reference_number,
    pr.received_date,
    pr.received_time,
    pr.received_by,
    pr.released_by,
    pr.updated_by,
    pr.created_at,
    pr.updated_at
FROM portal_requests pr
LEFT JOIN request_types rt ON rt.name = pr.kind
LEFT JOIN offices o ON o.name = pr.office
LEFT JOIN status_types st ON st.name = pr.status
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    request_type_id = EXCLUDED.request_type_id,
    kind = EXCLUDED.kind,
    owner_id = EXCLUDED.owner_id,
    owner_name = EXCLUDED.owner_name,
    office_id = EXCLUDED.office_id,
    office_name = EXCLUDED.office_name,
    status_type_id = EXCLUDED.status_type_id,
    status = EXCLUDED.status,
    request_date = EXCLUDED.request_date,
    request_time = EXCLUDED.request_time,
    remarks = EXCLUDED.remarks,
    reference_number = EXCLUDED.reference_number,
    received_date = EXCLUDED.received_date,
    received_time = EXCLUDED.received_time,
    received_by = EXCLUDED.received_by,
    released_by = EXCLUDED.released_by,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at;

ALTER TABLE request_messages
    DROP CONSTRAINT IF EXISTS request_messages_request_id_fkey;

ALTER TABLE request_messages
    ADD CONSTRAINT request_messages_request_id_fkey
    FOREIGN KEY (request_id) REFERENCES request_records(id) ON DELETE CASCADE;

INSERT INTO registrar_requests (
    request_id, student_id, program, major, year_level, semester, school_year,
    purpose, transfer_reason, requested_docs, claim_release_date
)
SELECT
    id, student_id, program, major, year_level, semester, school_year,
    purpose, transfer_reason, requested_docs, claim_release_date
FROM portal_requests
WHERE office = 'Registrar' OR kind IN (
    'TOR Request', 'COE Request', 'Exit Clearance', 'Certificate of Registration',
    'Certificate of Grades', 'Certificate of Credit Units',
    'Change of Subject due to Conflict of Schedule', 'Adding/Dropping of Subjects',
    'Other Registrar Request'
)
ON CONFLICT (request_id) DO UPDATE SET
    student_id = EXCLUDED.student_id,
    program = EXCLUDED.program,
    major = EXCLUDED.major,
    year_level = EXCLUDED.year_level,
    semester = EXCLUDED.semester,
    school_year = EXCLUDED.school_year,
    purpose = EXCLUDED.purpose,
    transfer_reason = EXCLUDED.transfer_reason,
    requested_docs = EXCLUDED.requested_docs,
    claim_release_date = EXCLUDED.claim_release_date;

INSERT INTO certificate_requests (request_id, certificate_kind, purpose)
SELECT id, kind, purpose
FROM portal_requests
WHERE kind IN (
    'TOR Request', 'COE Request', 'Certificate of Registration',
    'Certificate of Grades', 'Certificate of Credit Units'
)
ON CONFLICT (request_id) DO UPDATE SET certificate_kind = EXCLUDED.certificate_kind, purpose = EXCLUDED.purpose;

INSERT INTO subject_change_requests (request_id, student_id, program, year_level, semester, school_year, reason)
SELECT id, student_id, program, year_level, semester, school_year, transfer_reason
FROM portal_requests
WHERE kind = 'Change of Subject due to Conflict of Schedule'
ON CONFLICT (request_id) DO UPDATE SET
    student_id = EXCLUDED.student_id,
    program = EXCLUDED.program,
    year_level = EXCLUDED.year_level,
    semester = EXCLUDED.semester,
    school_year = EXCLUDED.school_year,
    reason = EXCLUDED.reason;

INSERT INTO add_drop_requests (request_id, student_id, program, year_level, semester, school_year, reason)
SELECT id, student_id, program, year_level, semester, school_year, transfer_reason
FROM portal_requests
WHERE kind = 'Adding/Dropping of Subjects'
ON CONFLICT (request_id) DO UPDATE SET
    student_id = EXCLUDED.student_id,
    program = EXCLUDED.program,
    year_level = EXCLUDED.year_level,
    semester = EXCLUDED.semester,
    school_year = EXCLUDED.school_year,
    reason = EXCLUDED.reason;

INSERT INTO tor_requests (request_id, student_id, program, year_level, semester, school_year, purpose)
SELECT id, student_id, program, year_level, semester, school_year, purpose FROM portal_requests WHERE kind = 'TOR Request'
ON CONFLICT (request_id) DO UPDATE SET student_id = EXCLUDED.student_id, program = EXCLUDED.program, year_level = EXCLUDED.year_level, semester = EXCLUDED.semester, school_year = EXCLUDED.school_year, purpose = EXCLUDED.purpose;

INSERT INTO coe_requests (request_id, student_id, program, year_level, semester, school_year, purpose)
SELECT id, student_id, program, year_level, semester, school_year, purpose FROM portal_requests WHERE kind = 'COE Request'
ON CONFLICT (request_id) DO UPDATE SET student_id = EXCLUDED.student_id, program = EXCLUDED.program, year_level = EXCLUDED.year_level, semester = EXCLUDED.semester, school_year = EXCLUDED.school_year, purpose = EXCLUDED.purpose;

INSERT INTO cor_requests (request_id, student_id, program, year_level, semester, school_year, purpose)
SELECT id, student_id, program, year_level, semester, school_year, purpose FROM portal_requests WHERE kind = 'Certificate of Registration'
ON CONFLICT (request_id) DO UPDATE SET student_id = EXCLUDED.student_id, program = EXCLUDED.program, year_level = EXCLUDED.year_level, semester = EXCLUDED.semester, school_year = EXCLUDED.school_year, purpose = EXCLUDED.purpose;

INSERT INTO certificate_of_grades_requests (request_id, student_id, program, year_level, semester, school_year, purpose)
SELECT id, student_id, program, year_level, semester, school_year, purpose FROM portal_requests WHERE kind = 'Certificate of Grades'
ON CONFLICT (request_id) DO UPDATE SET student_id = EXCLUDED.student_id, program = EXCLUDED.program, year_level = EXCLUDED.year_level, semester = EXCLUDED.semester, school_year = EXCLUDED.school_year, purpose = EXCLUDED.purpose;

INSERT INTO certificate_credit_units_requests (request_id, student_id, program, year_level, semester, school_year, purpose)
SELECT id, student_id, program, year_level, semester, school_year, purpose FROM portal_requests WHERE kind = 'Certificate of Credit Units'
ON CONFLICT (request_id) DO UPDATE SET student_id = EXCLUDED.student_id, program = EXCLUDED.program, year_level = EXCLUDED.year_level, semester = EXCLUDED.semester, school_year = EXCLUDED.school_year, purpose = EXCLUDED.purpose;

INSERT INTO registrar_other_requests (request_id, student_id, program, year_level, semester, school_year, purpose)
SELECT id, student_id, program, year_level, semester, school_year, purpose FROM portal_requests WHERE kind = 'Other Registrar Request'
ON CONFLICT (request_id) DO UPDATE SET student_id = EXCLUDED.student_id, program = EXCLUDED.program, year_level = EXCLUDED.year_level, semester = EXCLUDED.semester, school_year = EXCLUDED.school_year, purpose = EXCLUDED.purpose;

UPDATE exit_clearance_requests e
SET request_id = pr.id
FROM portal_requests pr
WHERE e.request_id IS NULL
  AND e.reference_number = pr.reference_number
  AND pr.kind = 'Exit Clearance';

INSERT INTO leave_requests (
    request_id, leave_type_id, leave_type, filing_date, leave_start_date, leave_end_date,
    working_days, leave_duration, leave_time, inclusive_dates, communication, leave_detail,
    leave_vacation_location, leave_vacation_specify, leave_sick_location, leave_sick_illness,
    leave_women_illness, leave_study_purpose, leave_other_purpose, custom_leave_type,
    position, salary, hr_remarks
)
SELECT
    pr.id, lt.id, pr.kind, pr.filing_date, pr.leave_start_date, pr.leave_end_date,
    pr.working_days, pr.leave_duration, pr.leave_time, pr.inclusive_dates, pr.communication,
    pr.leave_detail, pr.leave_vacation_location, pr.leave_vacation_specify,
    pr.leave_sick_location, pr.leave_sick_illness, pr.leave_women_illness,
    pr.leave_study_purpose, pr.leave_other_purpose, pr.custom_leave_type,
    pr.position, pr.salary, pr.hr_remarks
FROM portal_requests pr
LEFT JOIN leave_types lt ON lt.name = pr.kind
WHERE pr.kind IN (SELECT name FROM leave_types)
ON CONFLICT (request_id) DO UPDATE SET
    leave_type_id = EXCLUDED.leave_type_id,
    leave_type = EXCLUDED.leave_type,
    filing_date = EXCLUDED.filing_date,
    leave_start_date = EXCLUDED.leave_start_date,
    leave_end_date = EXCLUDED.leave_end_date,
    working_days = EXCLUDED.working_days,
    leave_duration = EXCLUDED.leave_duration,
    leave_time = EXCLUDED.leave_time,
    inclusive_dates = EXCLUDED.inclusive_dates,
    communication = EXCLUDED.communication,
    leave_detail = EXCLUDED.leave_detail,
    leave_vacation_location = EXCLUDED.leave_vacation_location,
    leave_vacation_specify = EXCLUDED.leave_vacation_specify,
    leave_sick_location = EXCLUDED.leave_sick_location,
    leave_sick_illness = EXCLUDED.leave_sick_illness,
    leave_women_illness = EXCLUDED.leave_women_illness,
    leave_study_purpose = EXCLUDED.leave_study_purpose,
    leave_other_purpose = EXCLUDED.leave_other_purpose,
    custom_leave_type = EXCLUDED.custom_leave_type,
    position = EXCLUDED.position,
    salary = EXCLUDED.salary,
    hr_remarks = EXCLUDED.hr_remarks;

INSERT INTO leave_balances (
    request_id, vacation_leave_earned, vacation_leave_less, vacation_leave_balance,
    sick_leave_earned, sick_leave_less, sick_leave_balance
)
SELECT id, vacation_leave_earned, vacation_leave_less, vacation_leave_balance, sick_leave_earned, sick_leave_less, sick_leave_balance
FROM portal_requests
WHERE kind IN (SELECT name FROM leave_types)
ON CONFLICT (request_id) DO UPDATE SET
    vacation_leave_earned = EXCLUDED.vacation_leave_earned,
    vacation_leave_less = EXCLUDED.vacation_leave_less,
    vacation_leave_balance = EXCLUDED.vacation_leave_balance,
    sick_leave_earned = EXCLUDED.sick_leave_earned,
    sick_leave_less = EXCLUDED.sick_leave_less,
    sick_leave_balance = EXCLUDED.sick_leave_balance;

INSERT INTO leave_approvals (request_id, hr_recommendation, approved_for, disapproved_due_to)
SELECT id, hr_recommendation, approved_for, disapproved_due_to
FROM portal_requests
WHERE kind IN (SELECT name FROM leave_types)
ON CONFLICT (request_id) DO UPDATE SET
    hr_recommendation = EXCLUDED.hr_recommendation,
    approved_for = EXCLUDED.approved_for,
    disapproved_due_to = EXCLUDED.disapproved_due_to;

INSERT INTO supply_requests (request_id, purpose, requested_by, department)
SELECT id, purpose, owner, office
FROM portal_requests
WHERE kind IN ('Supply Request', 'Inventory Request')
ON CONFLICT (request_id) DO UPDATE SET purpose = EXCLUDED.purpose, requested_by = EXCLUDED.requested_by, department = EXCLUDED.department;

INSERT INTO facility_requests (request_id, facility, attendees, purpose, remarks, status)
SELECT id, COALESCE(facility, ''), attendees, purpose, facility_remarks, status
FROM portal_requests
WHERE kind = 'Facility Reservation'
ON CONFLICT (request_id) DO UPDATE SET
    facility = EXCLUDED.facility,
    attendees = EXCLUDED.attendees,
    purpose = EXCLUDED.purpose,
    remarks = EXCLUDED.remarks,
    status = EXCLUDED.status;

INSERT INTO facility_reservations (request_id, facility, reservation_date, attendees, purpose, remarks, status)
SELECT id, COALESCE(facility, ''), request_date, attendees, purpose, facility_remarks, status
FROM portal_requests
WHERE kind = 'Facility Reservation'
ON CONFLICT (request_id) DO UPDATE SET
    facility = EXCLUDED.facility,
    reservation_date = EXCLUDED.reservation_date,
    attendees = EXCLUDED.attendees,
    purpose = EXCLUDED.purpose,
    remarks = EXCLUDED.remarks,
    status = EXCLUDED.status;

INSERT INTO message_attachments (id, message_id, storage_path, file_name, file_size, file_type)
SELECT id || '-attachment', id, attachment_storage_path, attachment_name, attachment_size, attachment_type
FROM request_messages
WHERE NULLIF(BTRIM(COALESCE(attachment_storage_path, '')), '') IS NOT NULL
  AND NULLIF(BTRIM(COALESCE(attachment_name, '')), '') IS NOT NULL
  AND attachment_size IS NOT NULL
  AND NULLIF(BTRIM(COALESCE(attachment_type, '')), '') IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
    storage_path = EXCLUDED.storage_path,
    file_name = EXCLUDED.file_name,
    file_size = EXCLUDED.file_size,
    file_type = EXCLUDED.file_type;

INSERT INTO message_reads (message_id, user_id)
SELECT rm.id, read_user_id
FROM request_messages rm
CROSS JOIN LATERAL unnest(rm.read_by) AS read_user_id
JOIN app_users au ON au.id = read_user_id
ON CONFLICT (message_id, user_id) DO NOTHING;

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

CREATE OR REPLACE FUNCTION portal_request_reference_prefix(request_kind TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
    SELECT CASE
        WHEN request_kind IN (SELECT name FROM leave_types) THEN 'LV'
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
            FROM request_records
            WHERE reference_number = candidate
        );
    END LOOP;

    RETURN candidate;
END
$$;

CREATE OR REPLACE FUNCTION set_request_record_reference_number()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
    IF NEW.reference_number IS NULL OR BTRIM(NEW.reference_number) = '' THEN
        NEW.reference_number := next_portal_request_reference_number(NEW.kind, NEW.request_date);
    END IF;

    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS set_request_record_reference_number ON request_records;

CREATE TRIGGER set_request_record_reference_number
    BEFORE INSERT OR UPDATE OF kind, reference_number, request_date
    ON request_records
    FOR EACH ROW
    EXECUTE FUNCTION set_request_record_reference_number();

CREATE OR REPLACE FUNCTION upsert_portal_request(payload JSONB)
RETURNS TEXT
LANGUAGE PLPGSQL
AS $$
DECLARE
    request_kind TEXT := payload->>'kind';
    v_request_id TEXT := payload->>'id';
    request_office TEXT := payload->>'office';
    request_status TEXT := COALESCE(NULLIF(payload->>'status', ''), 'Pending');
    requested_on DATE := COALESCE(NULLIF(payload->>'date', '')::date, CURRENT_DATE);
    reference_value TEXT := NULLIF(payload->>'referenceNumber', '');
BEGIN
    INSERT INTO request_records (
        id, title, request_type_id, kind, owner_id, owner_name, office_id, office_name,
        status_type_id, status, request_date, request_time, remarks, reference_number,
        received_date, received_time, received_by, released_by, updated_by
    )
    VALUES (
        v_request_id,
        COALESCE(payload->>'title', request_kind),
        (SELECT id FROM request_types WHERE name = request_kind),
        request_kind,
        CASE WHEN EXISTS (SELECT 1 FROM app_users WHERE id = payload->>'ownerId') THEN payload->>'ownerId' ELSE NULL END,
        COALESCE(payload->>'owner', ''),
        (SELECT id FROM offices WHERE name = request_office),
        COALESCE(request_office, ''),
        (SELECT id FROM status_types WHERE name = request_status LIMIT 1),
        request_status,
        requested_on,
        COALESCE(payload->>'time', ''),
        COALESCE(payload->>'remarks', ''),
        reference_value,
        NULLIF(payload->>'receivedDate', '')::date,
        NULLIF(payload->>'receivedTime', ''),
        NULLIF(payload->>'receivedBy', ''),
        NULLIF(payload->>'releasedBy', ''),
        NULLIF(payload->>'updatedBy', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        request_type_id = EXCLUDED.request_type_id,
        kind = EXCLUDED.kind,
        owner_id = EXCLUDED.owner_id,
        owner_name = EXCLUDED.owner_name,
        office_id = EXCLUDED.office_id,
        office_name = EXCLUDED.office_name,
        status_type_id = EXCLUDED.status_type_id,
        status = EXCLUDED.status,
        request_date = EXCLUDED.request_date,
        request_time = EXCLUDED.request_time,
        remarks = EXCLUDED.remarks,
        reference_number = COALESCE(EXCLUDED.reference_number, request_records.reference_number),
        received_date = EXCLUDED.received_date,
        received_time = EXCLUDED.received_time,
        received_by = EXCLUDED.received_by,
        released_by = EXCLUDED.released_by,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW();

    DELETE FROM registrar_requests WHERE request_id = v_request_id;
    DELETE FROM certificate_requests WHERE request_id = v_request_id;
    DELETE FROM subject_change_requests WHERE request_id = v_request_id;
    DELETE FROM add_drop_requests WHERE request_id = v_request_id;
    DELETE FROM tor_requests WHERE request_id = v_request_id;
    DELETE FROM coe_requests WHERE request_id = v_request_id;
    DELETE FROM cor_requests WHERE request_id = v_request_id;
    DELETE FROM certificate_of_grades_requests WHERE request_id = v_request_id;
    DELETE FROM certificate_credit_units_requests WHERE request_id = v_request_id;
    DELETE FROM registrar_other_requests WHERE request_id = v_request_id;
    DELETE FROM leave_requests WHERE request_id = v_request_id;
    DELETE FROM supply_requests WHERE request_id = v_request_id;
    DELETE FROM facility_requests WHERE request_id = v_request_id;

    IF request_kind IN (
        'TOR Request', 'COE Request', 'Exit Clearance', 'Certificate of Registration',
        'Certificate of Grades', 'Certificate of Credit Units',
        'Change of Subject due to Conflict of Schedule', 'Adding/Dropping of Subjects',
        'Other Registrar Request'
    ) THEN
        INSERT INTO registrar_requests (
            request_id, student_id, program, major, year_level, semester, school_year,
            purpose, transfer_reason, requested_docs, claim_release_date
        )
        VALUES (
            v_request_id,
            NULLIF(payload->>'studentId', ''),
            NULLIF(payload->>'program', ''),
            NULLIF(payload->>'major', ''),
            NULLIF(payload->>'yearLevel', ''),
            NULLIF(payload->>'semester', ''),
            NULLIF(payload->>'schoolYear', ''),
            NULLIF(payload->>'purpose', ''),
            NULLIF(payload->>'transferReason', ''),
            ARRAY(SELECT jsonb_array_elements_text(COALESCE(payload->'requestedDocs', '[]'::jsonb))),
            NULLIF(payload->>'claimReleaseDate', '')
        );

        IF request_kind IN ('TOR Request', 'COE Request', 'Certificate of Registration', 'Certificate of Grades', 'Certificate of Credit Units') THEN
            INSERT INTO certificate_requests (request_id, certificate_kind, purpose)
            VALUES (v_request_id, request_kind, NULLIF(payload->>'purpose', ''));
        END IF;

        IF request_kind = 'Change of Subject due to Conflict of Schedule' THEN
            INSERT INTO subject_change_requests (request_id, student_id, program, year_level, semester, school_year, reason)
            VALUES (v_request_id, NULLIF(payload->>'studentId', ''), NULLIF(payload->>'program', ''), NULLIF(payload->>'yearLevel', ''), NULLIF(payload->>'semester', ''), NULLIF(payload->>'schoolYear', ''), NULLIF(payload->>'transferReason', ''));
        ELSIF request_kind = 'Adding/Dropping of Subjects' THEN
            INSERT INTO add_drop_requests (request_id, student_id, program, year_level, semester, school_year, reason)
            VALUES (v_request_id, NULLIF(payload->>'studentId', ''), NULLIF(payload->>'program', ''), NULLIF(payload->>'yearLevel', ''), NULLIF(payload->>'semester', ''), NULLIF(payload->>'schoolYear', ''), NULLIF(payload->>'transferReason', ''));
        ELSIF request_kind = 'TOR Request' THEN
            INSERT INTO tor_requests (request_id, student_id, program, year_level, semester, school_year, purpose)
            VALUES (v_request_id, NULLIF(payload->>'studentId', ''), NULLIF(payload->>'program', ''), NULLIF(payload->>'yearLevel', ''), NULLIF(payload->>'semester', ''), NULLIF(payload->>'schoolYear', ''), NULLIF(payload->>'purpose', ''));
        ELSIF request_kind = 'COE Request' THEN
            INSERT INTO coe_requests (request_id, student_id, program, year_level, semester, school_year, purpose)
            VALUES (v_request_id, NULLIF(payload->>'studentId', ''), NULLIF(payload->>'program', ''), NULLIF(payload->>'yearLevel', ''), NULLIF(payload->>'semester', ''), NULLIF(payload->>'schoolYear', ''), NULLIF(payload->>'purpose', ''));
        ELSIF request_kind = 'Certificate of Registration' THEN
            INSERT INTO cor_requests (request_id, student_id, program, year_level, semester, school_year, purpose)
            VALUES (v_request_id, NULLIF(payload->>'studentId', ''), NULLIF(payload->>'program', ''), NULLIF(payload->>'yearLevel', ''), NULLIF(payload->>'semester', ''), NULLIF(payload->>'schoolYear', ''), NULLIF(payload->>'purpose', ''));
        ELSIF request_kind = 'Certificate of Grades' THEN
            INSERT INTO certificate_of_grades_requests (request_id, student_id, program, year_level, semester, school_year, purpose)
            VALUES (v_request_id, NULLIF(payload->>'studentId', ''), NULLIF(payload->>'program', ''), NULLIF(payload->>'yearLevel', ''), NULLIF(payload->>'semester', ''), NULLIF(payload->>'schoolYear', ''), NULLIF(payload->>'purpose', ''));
        ELSIF request_kind = 'Certificate of Credit Units' THEN
            INSERT INTO certificate_credit_units_requests (request_id, student_id, program, year_level, semester, school_year, purpose)
            VALUES (v_request_id, NULLIF(payload->>'studentId', ''), NULLIF(payload->>'program', ''), NULLIF(payload->>'yearLevel', ''), NULLIF(payload->>'semester', ''), NULLIF(payload->>'schoolYear', ''), NULLIF(payload->>'purpose', ''));
        ELSIF request_kind = 'Other Registrar Request' THEN
            INSERT INTO registrar_other_requests (request_id, student_id, program, year_level, semester, school_year, purpose)
            VALUES (v_request_id, NULLIF(payload->>'studentId', ''), NULLIF(payload->>'program', ''), NULLIF(payload->>'yearLevel', ''), NULLIF(payload->>'semester', ''), NULLIF(payload->>'schoolYear', ''), NULLIF(payload->>'purpose', ''));
        END IF;
    END IF;

    IF request_kind IN (SELECT name FROM leave_types) THEN
        INSERT INTO leave_requests (
            request_id, leave_type_id, leave_type, filing_date, leave_start_date, leave_end_date,
            working_days, leave_duration, leave_time, inclusive_dates, communication, leave_detail,
            leave_vacation_location, leave_vacation_specify, leave_sick_location, leave_sick_illness,
            leave_women_illness, leave_study_purpose, leave_other_purpose, custom_leave_type,
            position, salary, hr_remarks
        )
        VALUES (
            v_request_id,
            (SELECT id FROM leave_types WHERE name = request_kind),
            request_kind,
            NULLIF(payload->>'filingDate', '')::date,
            NULLIF(payload->>'leaveStartDate', '')::date,
            NULLIF(payload->>'leaveEndDate', '')::date,
            NULLIF(payload->>'workingDays', '')::numeric,
            NULLIF(payload->>'leaveDuration', ''),
            NULLIF(payload->>'leaveTime', ''),
            NULLIF(payload->>'inclusiveDates', ''),
            NULLIF(payload->>'communication', ''),
            NULLIF(payload->>'leaveDetail', ''),
            NULLIF(payload->>'leaveVacationLocation', ''),
            NULLIF(payload->>'leaveVacationSpecify', ''),
            NULLIF(payload->>'leaveSickLocation', ''),
            NULLIF(payload->>'leaveSickIllness', ''),
            NULLIF(payload->>'leaveWomenIllness', ''),
            NULLIF(payload->>'leaveStudyPurpose', ''),
            NULLIF(payload->>'leaveOtherPurpose', ''),
            NULLIF(payload->>'customLeaveType', ''),
            NULLIF(payload->>'position', ''),
            NULLIF(payload->>'salary', ''),
            NULLIF(payload->>'hrRemarks', '')
        );

        INSERT INTO leave_balances (
            request_id, vacation_leave_earned, vacation_leave_less, vacation_leave_balance,
            sick_leave_earned, sick_leave_less, sick_leave_balance
        )
        VALUES (
            v_request_id,
            NULLIF(payload->>'vacationLeaveEarned', ''),
            NULLIF(payload->>'vacationLeaveLess', ''),
            NULLIF(payload->>'vacationLeaveBalance', ''),
            NULLIF(payload->>'sickLeaveEarned', ''),
            NULLIF(payload->>'sickLeaveLess', ''),
            NULLIF(payload->>'sickLeaveBalance', '')
        );

        INSERT INTO leave_approvals (request_id, hr_recommendation, approved_for, disapproved_due_to)
        VALUES (
            v_request_id,
            NULLIF(payload->>'hrRecommendation', ''),
            NULLIF(payload->>'approvedFor', ''),
            NULLIF(payload->>'disapprovedDueTo', '')
        );
    END IF;

    IF request_kind IN ('Supply Request', 'Inventory Request') THEN
        INSERT INTO supply_requests (request_id, purpose, requested_by, department)
        VALUES (v_request_id, NULLIF(payload->>'purpose', ''), NULLIF(payload->>'owner', ''), request_office);
    END IF;

    IF request_kind = 'Facility Reservation' THEN
        INSERT INTO facility_requests (request_id, facility, attendees, purpose, remarks, status)
        VALUES (
            v_request_id,
            COALESCE(NULLIF(payload->>'facility', ''), 'Unspecified facility'),
            NULLIF(payload->>'attendees', '')::integer,
            NULLIF(payload->>'purpose', ''),
            NULLIF(payload->>'facilityRemarks', ''),
            request_status
        );

        INSERT INTO facility_reservations (request_id, facility, reservation_date, attendees, purpose, remarks, status)
        VALUES (
            v_request_id,
            COALESCE(NULLIF(payload->>'facility', ''), 'Unspecified facility'),
            requested_on,
            NULLIF(payload->>'attendees', '')::integer,
            NULLIF(payload->>'purpose', ''),
            NULLIF(payload->>'facilityRemarks', ''),
            request_status
        );
    END IF;

    RETURN v_request_id;
END
$$;
