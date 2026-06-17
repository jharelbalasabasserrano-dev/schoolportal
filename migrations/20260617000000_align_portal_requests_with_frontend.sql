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
        'Personal Leave',
        'Official Leave',
        'Facility Reservation'
    ));

ALTER TABLE portal_requests
    ADD COLUMN IF NOT EXISTS major TEXT,
    ADD COLUMN IF NOT EXISTS transfer_reason TEXT,
    ADD COLUMN IF NOT EXISTS requested_docs TEXT[],
    ADD COLUMN IF NOT EXISTS claim_release_date TEXT,
    ADD COLUMN IF NOT EXISTS position TEXT,
    ADD COLUMN IF NOT EXISTS salary TEXT,
    ADD COLUMN IF NOT EXISTS working_days INTEGER CHECK (working_days IS NULL OR working_days > 0),
    ADD COLUMN IF NOT EXISTS inclusive_dates TEXT,
    ADD COLUMN IF NOT EXISTS communication TEXT,
    ADD COLUMN IF NOT EXISTS leave_detail TEXT,
    ADD COLUMN IF NOT EXISTS hr_remarks TEXT;

