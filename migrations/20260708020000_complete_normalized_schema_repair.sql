ALTER TABLE leave_approvals
    ADD COLUMN IF NOT EXISTS approved_days_with_pay TEXT,
    ADD COLUMN IF NOT EXISTS approved_days_without_pay TEXT,
    ADD COLUMN IF NOT EXISTS approved_other TEXT;

UPDATE leave_approvals
SET approved_days_with_pay = COALESCE(approved_days_with_pay, approved_for)
WHERE approved_days_with_pay IS NULL
  AND approved_for IS NOT NULL;

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
    la.approved_days_with_pay,
    la.approved_days_without_pay,
    la.approved_other,
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

        INSERT INTO leave_approvals (
            request_id, hr_recommendation, approved_for, approved_days_with_pay,
            approved_days_without_pay, approved_other, disapproved_due_to
        )
        VALUES (
            v_request_id,
            NULLIF(payload->>'hrRecommendation', ''),
            NULLIF(payload->>'approvedFor', ''),
            NULLIF(payload->>'approvedDaysWithPay', ''),
            NULLIF(payload->>'approvedDaysWithoutPay', ''),
            NULLIF(payload->>'approvedOther', ''),
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
