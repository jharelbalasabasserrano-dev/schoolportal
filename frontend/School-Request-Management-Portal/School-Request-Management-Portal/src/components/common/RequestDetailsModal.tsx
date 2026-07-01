import { Printer } from 'lucide-react';
import { PortalRequest } from '../../types';
import { Modal } from './Modal';
import { documentKinds } from '../../utils/constants';
import { getAttendeeCount, printFacilityBookingForm, printDocumentRequestForm } from '../../utils/helpers';
import { FacilityBookingPrintForm, ExitClearancePrintForm, RegistrarRequestPrintForm } from './PrintForms';

export function RequestDetailsModal({ onClose, request }: { onClose: () => void; request: PortalRequest }) {
  const isFacilityReservation = request.kind === 'Facility Reservation';
  const isDocumentRequest = documentKinds.includes(request.kind);

  return (
    <Modal title="Request Details" onClose={onClose} wide={isFacilityReservation || isDocumentRequest}>
      <div className="space-y-3">
        {[
          ['Request ID', request.id],
          ['Title', request.title],
          ['Type', request.kind],
          ['Requester', request.owner],
          ['Office', request.office],
          ['Schedule', `${request.date} at ${request.time}`],
          ['Facility', request.facility ?? 'Not applicable'],
          ['Attendees', isFacilityReservation ? String(getAttendeeCount(request)) : 'Not applicable'],
          ['Status', request.status],
          ['Updated By', request.updatedBy ?? 'No office action yet'],
          [isFacilityReservation ? 'Purpose' : 'Remarks', request.remarks],
          ['Facility Remarks', isFacilityReservation ? request.facilityRemarks ?? 'No facility remarks yet' : 'Not applicable'],
        ].map(([label, value]) => (
          <div key={label} className="grid grid-cols-[130px_1fr] gap-3 rounded-md bg-stone-50 px-4 py-3">
            <span className="font-medium text-slate-600">{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
      {isFacilityReservation && (
        <div className="mt-6 border-t border-[#e7e1db] pt-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-bold">Printable booking form</h3>
              <p className="text-slate-500">Use this copy for facility reservation filing.</p>
            </div>
            <button type="button" onClick={() => printFacilityBookingForm(request)} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#228b22] px-4 font-semibold text-white">
              <Printer size={17} />
              Print form
            </button>
          </div>
          <FacilityBookingPrintForm request={request} />
        </div>
      )}
      {isDocumentRequest && (
        <div className="mt-6 border-t border-[#e7e1db] pt-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-bold">Printable Registrar form</h3>
              <p className="text-slate-500">Use this copy for Registrar filing and release.</p>
            </div>
            <button type="button" onClick={() => printDocumentRequestForm(request)} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#228b22] px-4 font-semibold text-white">
              <Printer size={17} />
              Print form
            </button>
          </div>
          {request.kind === 'Exit Clearance' ? <ExitClearancePrintForm request={request} /> : <RegistrarRequestPrintForm request={request} />}
        </div>
      )}
    </Modal>
  );
}