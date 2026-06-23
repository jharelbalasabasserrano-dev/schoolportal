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
        'Other Leave',
        'Personal Leave',
        'Official Leave',
        'Facility Reservation'
    ));
