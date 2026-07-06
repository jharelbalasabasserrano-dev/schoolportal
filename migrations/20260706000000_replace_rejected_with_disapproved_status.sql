ALTER TABLE portal_requests
    DROP CONSTRAINT IF EXISTS portal_requests_status_check;

UPDATE portal_requests
SET status = 'Disapproved'
WHERE status = 'Rejected';

ALTER TABLE portal_requests
    ADD CONSTRAINT portal_requests_status_check CHECK (status IN (
        'Pending',
        'On Process',
        'Ready for Pick Up',
        'Approved',
        'Disapproved',
        'Completed'
    ));
