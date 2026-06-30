ALTER TABLE portal_requests
    DROP CONSTRAINT IF EXISTS portal_requests_kind_check;

ALTER TABLE portal_requests
    ADD CONSTRAINT portal_requests_kind_check CHECK (kind IN (
        'TOR Request',
        'COE Request',
        'Exit Clearance',
        'Certificate of Registration',
        'Certificate of Grades',
        'Certificate of Credit Units',
        'Change of Subject due to Conflict of Schedule',
        'Adding/Dropping of Subjects',
        'Other Registrar Request',
        'Supply Request',
        'Inventory Request',
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
        'Official Leave',
        'Facility Reservation'
    ));

ALTER TABLE portal_requests
    DROP CONSTRAINT IF EXISTS portal_requests_working_days_check;

ALTER TABLE portal_requests
    ALTER COLUMN working_days TYPE NUMERIC USING working_days::numeric,
    ADD CONSTRAINT portal_requests_working_days_check CHECK (working_days IS NULL OR working_days > 0),
    ADD COLUMN IF NOT EXISTS custom_leave_type TEXT,
    ADD COLUMN IF NOT EXISTS leave_duration TEXT CHECK (leave_duration IS NULL OR leave_duration IN ('Full Day', 'Half Day')),
    ADD COLUMN IF NOT EXISTS leave_time TEXT;
