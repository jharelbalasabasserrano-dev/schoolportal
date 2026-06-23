ALTER TABLE portal_requests
    ADD COLUMN IF NOT EXISTS filing_date DATE,
    ADD COLUMN IF NOT EXISTS leave_start_date DATE,
    ADD COLUMN IF NOT EXISTS leave_end_date DATE,
    ADD COLUMN IF NOT EXISTS vacation_leave_earned TEXT,
    ADD COLUMN IF NOT EXISTS vacation_leave_less TEXT,
    ADD COLUMN IF NOT EXISTS vacation_leave_balance TEXT,
    ADD COLUMN IF NOT EXISTS sick_leave_earned TEXT,
    ADD COLUMN IF NOT EXISTS sick_leave_less TEXT,
    ADD COLUMN IF NOT EXISTS sick_leave_balance TEXT,
    ADD COLUMN IF NOT EXISTS hr_recommendation TEXT,
    ADD COLUMN IF NOT EXISTS approved_for TEXT,
    ADD COLUMN IF NOT EXISTS disapproved_due_to TEXT;
