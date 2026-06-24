CREATE TABLE IF NOT EXISTS app_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL CHECK (role IN (
        'student',
        'registrar',
        'supply',
        'adminOffice',
        'hr',
        'employee',
        'admin'
    )),
    department TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portal_requests (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN (
        'TOR Request',
        'COE Request',
        'Exit Clearance',
        'Certificate of Registration',
        'Certificate of Grades',
        'Certificate of Credit Units',
        'Supply Request',
        'Inventory Request',
        'Vacation Leave',
        'Sick Leave',
        'Personal Leave',
        'Official Leave',
        'Facility Reservation'
    )),
    owner_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
    owner TEXT NOT NULL,
    office TEXT NOT NULL CHECK (office IN (
        'Registrar',
        'Supply Office',
        'Admin Office',
        'HR Office'
    )),
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN (
        'Pending',
        'Approved',
        'Rejected',
        'Completed'
    )),
    request_date DATE NOT NULL,
    request_time TEXT NOT NULL,
    remarks TEXT NOT NULL DEFAULT '',
    facility TEXT,
    attendees INTEGER CHECK (attendees IS NULL OR attendees > 0),
    purpose TEXT,
    facility_remarks TEXT,
    student_id TEXT,
    year_level TEXT,
    semester TEXT,
    school_year TEXT,
    program TEXT,
    received_by TEXT,
    released_by TEXT,
    updated_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS portal_requests_owner_id_idx ON portal_requests(owner_id);
CREATE INDEX IF NOT EXISTS portal_requests_kind_idx ON portal_requests(kind);
CREATE INDEX IF NOT EXISTS portal_requests_status_idx ON portal_requests(status);
CREATE INDEX IF NOT EXISTS portal_requests_office_idx ON portal_requests(office);
CREATE INDEX IF NOT EXISTS portal_requests_request_date_idx ON portal_requests(request_date DESC);

CREATE TABLE IF NOT EXISTS request_messages (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES portal_requests(id) ON DELETE CASCADE,
    sender_id TEXT REFERENCES app_users(id) ON DELETE SET NULL,
    sender_name TEXT NOT NULL,
    body TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attachment_data_url TEXT,
    attachment_name TEXT,
    attachment_size INTEGER,
    attachment_type TEXT
);

CREATE INDEX IF NOT EXISTS request_messages_request_id_idx ON request_messages(request_id);
CREATE INDEX IF NOT EXISTS request_messages_sent_at_idx ON request_messages(sent_at DESC);

CREATE TABLE IF NOT EXISTS supply_categories (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    contact TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    lead_time INTEGER NOT NULL DEFAULT 0 CHECK (lead_time >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supply_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    unit TEXT NOT NULL,
    min_threshold INTEGER NOT NULL DEFAULT 0 CHECK (min_threshold >= 0),
    location TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    cost NUMERIC(12, 2) CHECK (cost IS NULL OR cost >= 0),
    supplier TEXT,
    expiry_date DATE,
    sku TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS supply_items_category_idx ON supply_items(category);
CREATE INDEX IF NOT EXISTS supply_items_supplier_idx ON supply_items(supplier);
CREATE INDEX IF NOT EXISTS supply_items_low_stock_idx ON supply_items(quantity, min_threshold);

CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES supply_items(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('Stock In', 'Stock Out')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reason TEXT NOT NULL DEFAULT '',
    performed_by TEXT NOT NULL,
    movement_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    previous_qty INTEGER CHECK (previous_qty IS NULL OR previous_qty >= 0),
    new_qty INTEGER CHECK (new_qty IS NULL OR new_qty >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stock_movements_item_id_idx ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS stock_movements_type_idx ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS stock_movements_date_idx ON stock_movements(movement_date DESC);

CREATE TABLE IF NOT EXISTS notification_reads (
    user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    notification_id TEXT NOT NULL,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, notification_id)
);

CREATE INDEX IF NOT EXISTS exit_clearance_requests_status_idx ON exit_clearance_requests(status);
CREATE INDEX IF NOT EXISTS exit_clearance_requests_created_at_idx ON exit_clearance_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS exit_clearance_requests_id_number_idx ON exit_clearance_requests(id_number);
