CREATE TABLE exit_clearance_requests (
    id UUID PRIMARY KEY,

    reference_number TEXT UNIQUE NOT NULL,
    tracking_number TEXT UNIQUE NOT NULL,

    student_name TEXT NOT NULL,
    id_number TEXT NOT NULL,

    program TEXT NOT NULL,
    year_level TEXT NOT NULL,

    acad_year TEXT NOT NULL,
    semester TEXT NOT NULL,

    reason_transfer TEXT,
    requested_docs TEXT,

    purpose TEXT,

    status TEXT NOT NULL DEFAULT 'Pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
