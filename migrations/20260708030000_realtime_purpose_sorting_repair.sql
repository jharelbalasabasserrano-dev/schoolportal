CREATE INDEX IF NOT EXISTS request_records_created_at_idx ON request_records(created_at DESC);

UPDATE registrar_requests reg
SET purpose = NULLIF(rr.remarks, '')
FROM request_records rr
WHERE reg.request_id = rr.id
  AND reg.purpose IS NULL
  AND NULLIF(rr.remarks, '') IS NOT NULL;

UPDATE supply_requests sr
SET purpose = NULLIF(rr.remarks, '')
FROM request_records rr
WHERE sr.request_id = rr.id
  AND sr.purpose IS NULL
  AND NULLIF(rr.remarks, '') IS NOT NULL;

UPDATE facility_requests fr
SET purpose = NULLIF(rr.remarks, '')
FROM request_records rr
WHERE fr.request_id = rr.id
  AND fr.purpose IS NULL
  AND NULLIF(rr.remarks, '') IS NOT NULL;

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
    rr.created_at,
    COALESCE(NULLIF(rr.remarks, ''), fr.purpose, sr.purpose, reg.purpose, '') AS remarks,
    fr.facility,
    fr.attendees,
    COALESCE(fr.purpose, sr.purpose, reg.purpose, NULLIF(rr.remarks, '')) AS purpose,
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
