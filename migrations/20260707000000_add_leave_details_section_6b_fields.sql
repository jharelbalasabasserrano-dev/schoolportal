ALTER TABLE portal_requests
    ADD COLUMN IF NOT EXISTS leave_vacation_location TEXT CHECK (leave_vacation_location IS NULL OR leave_vacation_location IN ('Within the Philippines', 'Abroad', '')),
    ADD COLUMN IF NOT EXISTS leave_vacation_specify TEXT,
    ADD COLUMN IF NOT EXISTS leave_sick_location TEXT CHECK (leave_sick_location IS NULL OR leave_sick_location IN ('In Hospital', 'Out Patient', '')),
    ADD COLUMN IF NOT EXISTS leave_sick_illness TEXT,
    ADD COLUMN IF NOT EXISTS leave_women_illness TEXT,
    ADD COLUMN IF NOT EXISTS leave_study_purpose TEXT CHECK (leave_study_purpose IS NULL OR leave_study_purpose IN ('Completion of Master''s Degree', 'BAR/Board Examination Review', '')),
    ADD COLUMN IF NOT EXISTS leave_other_purpose TEXT CHECK (leave_other_purpose IS NULL OR leave_other_purpose IN ('Monetization of Leave Credits', 'Terminal Leave', ''));
