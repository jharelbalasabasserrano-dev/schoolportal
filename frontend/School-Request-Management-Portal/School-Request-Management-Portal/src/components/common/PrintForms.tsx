import { PortalRequest } from '../../types';
import {
  formatDate, getRegistrarReferenceNumber, getExitClearanceReferenceNumber,
  getLeaveReferenceNumber, getFacilityReferenceNumber, getRegistrarRequestLabel,
  getCivilServiceLeaveTypes, getCivilServiceLeaveLabel, getExitClearanceOffices,
  getExitClearanceDocumentOptions, formatProgramWithMajor, getFacilityPrintVenue,
  getDateDuration, getLeaveDateRange, escapeHtml
} from '../../utils/helpers';
import ccdLogo from '../../assets/ccd-logo.png';
import davaoCitySeal from '../../assets/davao-city-seal.png';

export function RegistrarRequestPrintForm({ request }: { request: PortalRequest }) {
  const programOptions = ['Bachelor of Early Childhood Education', 'Bachelor of Technical-Vocational Teacher Education', 'major in Heating, Ventilating, Airconditioning, and Refrigeration Technology', 'major in Computer Programming', 'Bachelor of Science in Entrepreneurship'];
  const requestOptions = ['Certificate of Registration', 'Certificate of Enrollment', 'Certificate of Grades', 'Certificate of Credit Units', 'Transcript of Records (TOR)', 'Change of Student due to Conflict of Schedule', 'Adding/Dropping of Subjects', 'Other'];
  const selectedPrograms = [request.program ?? '', request.major ?? ''];
  const check = (selected: string | string[], option: string) => <span class="box">${(Array.isArray(selected) ? selected : [selected]).includes(option) ? 'x' : ''}</span>;

  return (
    <div className="rounded-lg border border-[#d9d3cc] bg-white p-6 font-serif text-slate-950 shadow-sm">
      <PrintPreviewHeader referenceNumber={getRegistrarReferenceNumber(request)}>
        <p className="text-2xl font-extrabold text-[#1e3a3a]">CITY COLLEGE OF DAVAO</p>
        <p className="text-sm text-[#2c5a6e]">Km. 10 Catalanun Pequeno, Davao City</p>
        <p className="mt-3 text-lg font-bold tracking-wide">OFFICE OF THE REGISTRAR</p>
      </PrintPreviewHeader>
      <h3 className="my-6 text-center text-2xl font-extrabold underline underline-offset-8">REQUEST FORM</h3>
      <div className="space-y-4 text-[15px]">
        <PrintLine label="Date" value={formatDate(request.date)} />
        <PrintLine label="Name" value={request.owner} />
        <PrintLine label="Student ID #" value={request.studentId ?? ''} />
        <PrintLine label="Year Level" value={request.yearLevel ?? ''} />
        <PrintLine label="Semester" value={request.semester ?? ''} />
        <PrintLine label="School Year" value={request.schoolYear ?? ''} />
        <PrintCheckGroup title="Program" options={programOptions} selected={selectedPrograms} />
        <PrintCheckGroup title="Request for" options={requestOptions} selected={getRegistrarRequestLabel(request.kind)} />
        <PrintLine label="Purpose/Reason" value={request.remarks} />
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <SignatureLine label="Requested by" value={request.owner} />
          <SignatureLine label="Received by" value={request.receivedBy ?? ''} />
          <SignatureLine label="Released by" value={request.releasedBy ?? ''} />
        </div>
      </div>
    </div>
  );
}

export function ExitClearancePrintForm({ request }: { request: PortalRequest }) {
  return (
    <div className="rounded-lg border border-[#d9d3cc] bg-white p-6 font-serif text-slate-950 shadow-sm">
      <PrintPreviewHeader referenceNumber={getExitClearanceReferenceNumber(request)}>
        <p className="text-sm font-semibold tracking-wide">Republic of the Philippines</p>
        <p className="text-2xl font-extrabold text-[#1e3a3a]">City College of Davao</p>
        <p className="text-sm text-[#2c5a6e]">Km. 10 Catalanun Pequeno, Davao City</p>
      </PrintPreviewHeader>
      <h3 className="my-6 text-center text-2xl font-extrabold underline underline-offset-8">Exit Clearance and Request Form</h3>
      <div className="space-y-4 text-[15px]">
        <PrintLine label="Name of Student" value={request.owner} />
        <PrintLine label="ID Number" value={request.studentId ?? ''} />
        <PrintLine label="Program" value={formatProgramWithMajor(request)} />
        <PrintLine label="Year Level" value={request.yearLevel ?? ''} />
        <PrintLine label="Academic Year Last Attended" value={request.schoolYear ?? ''} />
        <PrintLine label="Semester" value={request.semester ?? ''} />
        <OfficeClearanceTable />
        <PrintLine label="Reason for transfer" value={request.transferReason ?? ''} />
        <PrintCheckGroup title="Request for" options={getExitClearanceDocumentOptions()} selected={request.requestedDocs ?? []} />
        <PrintLine label="Purpose" value={request.remarks} />
        <div className="border-l-4 border-[#b68b40] bg-[#fef9e6] p-3 text-xs leading-5">
          In compliance with Republic Act No. 10173, also known as the Data Privacy Act of 2012, City College of Davao is committed to protect the privacy and personal information of its employees, stakeholders, and students.
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <SignatureLine label="Name and Signature of Student" value={request.owner} />
          <SignatureLine label="Date" value={formatDate(request.date)} />
        </div>
        <div className="mt-8 border-t-2 border-dashed border-[#2c5a6e] pt-5">
          <h4 className="mb-4 text-center text-xl font-extrabold">CLAIM SLIP</h4>
          <PrintLine label="Date" value={formatDate(request.date)} />
          <PrintLine label="Name of Student" value={request.owner} />
          <PrintLine label="Claim requested document/s on" value={request.claimReleaseDate ?? ''} />
          <div className="grid gap-6 md:grid-cols-2">
            <SignatureLine label="Received by" value={request.receivedBy ?? ''} />
            <SignatureLine label="Released by" value={request.releasedBy ?? ''} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function LeaveApplicationPrintForm({ request }: { request: PortalRequest }) {
  const leaveTypes = getCivilServiceLeaveTypes();
  const check = (selected: string, option: string) => <span class="box">${selected === option ? 'x' : ''}</span>;
  const leaveType = getCivilServiceLeaveLabel(request.kind);
  const recommendation = request.status === 'Rejected' ? 'For disapproval' : request.status === 'Pending' ? '' : 'For approval';

  return (
    <div className="rounded-lg border border-[#d9d3cc] bg-white p-4 font-serif text-sm text-slate-950 shadow-sm">
      <LeaveApplicationHeader request={request} />
      <h3 className="my-3 text-center text-xl font-extrabold underline underline-offset-4">APPLICATION FOR LEAVE</h3>
      <div className="border-y border-slate-300 py-2 font-semibold">1. OFFICE/DEPARTMENT: CITY COLLEGE OF DAVAO</div>
      <div className="space-y-2 pt-3 text-xs">
        <PrintLine label="2. Name" value={request.owner} />
        <PrintLine label="3. Date of Filing" value={formatDate(request.date)} />
        <PrintLine label="4. Position" value={request.position ?? ''} />
        <PrintLine label="5. Salary" value={request.salary ?? ''} />
        <div className="rounded-md border border-slate-300 bg-slate-50 p-3">
          <p className="mb-2 font-bold">6. Details of Application</p>
          <CompactPrintCheckGroup title="6.A Type of leave to be availed of" options={leaveTypes} selected={leaveType} />
          <PrintLine label="6.B Details of leave" value={request.leaveDetail ?? ''} />
          <PrintLine label="6.C Working days applied for" value={String(request.workingDays ?? getDateDuration(request.date, request.time))} />
          <PrintLine label="Inclusive dates" value={request.inclusiveDates ?? getLeaveDateRange(request)} />
          <CompactPrintCheckGroup title="6.D Communication" options={['Not Requested', 'Requested']} selected={request.communication ?? 'Not Requested'} />
          <SignatureLine label="Signature of Applicant" value={request.owner} />
        </div>
        <LeaveActionSection request={request} />
      </div>
    </div>
  );
}

export function FacilityBookingPrintForm({ request }: { request: PortalRequest }) {
  const venueOptions = ['Library', 'AVR (EdTech Lab)', 'BOT Room', 'Covered Court', 'Open Field', 'Business Incubation Room', 'Social Hall', 'Classroom'];
  const selectedVenue = getFacilityPrintVenue(request.facility);
  const purpose = request.purpose ?? request.remarks;
  const checkbox = (venue: string) => <span class="box">${selectedVenue === venue ? 'x' : ''}</span>;
  const otherValue = selectedVenue === 'Others' ? escapeHtml(request.facility ?? '') : '';

  return (
    <div className="rounded-lg border border-[#d9d3cc] bg-white p-6 font-serif text-slate-950 shadow-sm">
      <PrintPreviewHeader referenceNumber={getFacilityReferenceNumber(request)}>
        <p className="text-2xl font-extrabold text-[#1e3a3a]">CITY COLLEGE OF DAVAO</p>
        <p className="text-sm text-[#2c5a6e]">Km. 10 Catalanun Pequeno, Davao City</p>
      </PrintPreviewHeader>
      <h3 className="my-6 text-center text-2xl font-extrabold underline underline-offset-8">School Facility Booking Form</h3>
      <div className="space-y-4 text-[15px]">
        <PrintLine label="Date" value={formatDate(request.date)} />
        <PrintLine label="Purpose/Objective" value={purpose} />
        <PrintLine label="Time" value={request.time.replace('-', ' - ')} />
        <div>
          <p className="mb-3 font-semibold">Venue (pls check one):</p>
          <div className="rounded-md border border-slate-300 bg-slate-50 p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {venueOptions.map((venue) => (
                <span key={venue} className="flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center border border-slate-600 text-xs">{checkbox(venue)}</span>
                  {venue}
                </span>
              ))}
              <span className="flex items-center gap-2 sm:col-span-2">
                <span className="flex h-4 w-4 items-center justify-center border border-slate-600 text-xs">{checkbox('Others')}</span>
                Others (pls specify):
                <span className="min-w-48 flex-1 border-b border-slate-500 px-2">{otherValue}</span>
              </span>
            </div>
          </div>
        </div>
        <PrintLine label="Remarks (by the Facility-in-charge)" value={request.facilityRemarks ?? ''} />
        <PrintLine label="Requested by" value={`${request.owner} / ${formatDate(request.date)}`} />
        <PrintLine label="Recommended by" value="" />
        <PrintLine label="Approved by" value={request.status === 'Approved' || request.status === 'Completed' ? request.updatedBy ?? 'Admin Office' : ''} />
        <div className="border-l-4 border-[#b68b40] bg-[#fef9e6] p-3 text-sm">
          Note: Booking should be made within 3-14 days before the printed usage. Bookings made early or too late is discouraged.
        </div>
      </div>
    </div>
  );
}

function PrintPreviewHeader({ children, referenceNumber }: { children: ReactNode; referenceNumber: string }) {
  return (
    <div className="relative border-b-2 border-[#8b5a2b] pb-4 pr-36 text-center">
      <div className="absolute right-0 top-0 text-right text-xs">
        <p className="font-semibold uppercase text-[#1e6f5c]">Reference Number</p>
        <p className="mt-1 font-mono text-sm font-bold tracking-wide text-[#1e3a3a]">{referenceNumber}</p>
      </div>
      <img src={ccdLogo} alt="City College of Davao seal" style={{ left: 'calc(50% - 16rem)' }} className="absolute top-0 h-20 w-20 rounded-full object-contain" />
      {children}
    </div>
  );
}

function LeaveApplicationHeader({ request }: { request: PortalRequest }) {
  return (
    <PrintPreviewHeader referenceNumber={getLeaveReferenceNumber(request)}>
      <p className="font-bold">Civil Service Form No. 6</p>
      <p className="text-xs">Revised 2020</p>
      <p className="mt-3 text-sm font-semibold tracking-wide">Republic of the Philippines</p>
      <p className="text-xl font-extrabold">CITY GOVERNMENT OF DAVAO</p>
      <p className="font-semibold">DAVAO CITY</p>
    </PrintPreviewHeader>
  );
}

function LeaveActionSection({ request }: { request: PortalRequest }) {
  const recommendation = request.status === 'Rejected' ? 'For disapproval' : request.status === 'Pending' ? '' : 'For approval';
  return (
    <div className="rounded-md border border-slate-300 bg-slate-50 p-3">
      <p className="mb-2 font-bold">7. Details of Action on Application</p>
      <p className="font-semibold">7.A Certification of Leave Credits</p>
      <table className="my-2 w-full border-collapse text-center text-xs">
        <thead>
          <tr><th className="border border-slate-400 p-2" /><th className="border border-slate-400 p-2">Vacation Leave</th><th className="border border-slate-400 p-2">Sick Leave</th></tr>
        </thead>
        <tbody>
          {['Total Earned', 'Less this application', 'Balance'].map((label) => (
            <tr key={label}><td className="border border-slate-400 p-2 font-semibold">{label}</td><td className="border border-slate-400 p-2" /><td className="border border-slate-400 p-2" /></tr>
          ))}
        </tbody>
      </table>
      <CompactPrintCheckGroup title="7.B Recommendation" options={['For approval', 'For disapproval']} selected={recommendation} />
      <PrintLine label="HR remarks" value={request.hrRemarks ?? request.updatedBy ?? ''} />
      <PrintLine label="7.C Approved for" value={request.status === 'Approved' ? ${request.workingDays ?? getDateDuration(request.date, request.time)} day(s) with pay : ''} />
      <PrintLine label="7.D Disapproved due to" value={request.status === 'Rejected' ? request.hrRemarks ?? request.remarks : ''} />
      <div className="mt-3 text-center">
          &nbsp;&nbsp;&nbsp;
        <p className="font-bold">Wenefredo E. Cagape, EdD, PhD</p>
        <p>College President</p>
        <div className="mx-auto mt-5 w-2/3 border-b border-slate-700" />
        <p className="mt-2 font-semibold">Authorized Official</p>
      </div>
    </div>
  );
}

function OfficeClearanceTable() {
  return (
    <div className="overflow-hidden rounded-md border border-slate-400">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="border border-slate-400 px-3 py-2 text-left">Office</th>
            <th className="border border-slate-400 px-3 py-2 text-left">Signature</th>
            <th className="border border-slate-400 px-3 py-2 text-left">Date</th>
          </tr>
        </thead>
        <tbody>
          {getExitClearanceOffices().map((office) => (
            <tr key={office}>
              <td className="border border-slate-400 px-3 py-2">{office}</td>
              <td className="border border-slate-400 px-3 py-2" />
              <td className="border border-slate-400 px-3 py-2" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PrintCheckGroup({ options, selected, title }: { options: string[]; selected: string | string[]; title: string }) {
  const selectedValues = Array.isArray(selected) ? selected : [selected];
  return (
    <div className="rounded-md border border-slate-300 bg-slate-50 p-4">
      <p className="mb-3 font-semibold">{title}:</p>
      <div className="grid gap-2">
        {options.map((option) => (
          <span key={option} className="flex items-center gap-2">
            <span className="flex h-4 w-4 items-center justify-center border border-slate-600 text-xs">{selectedValues.includes(option) ? 'x' : ''}</span>
            {option}
          </span>
        ))}
      </div>
    </div>
  );
}

function CompactPrintCheckGroup({ options, selected, title }: { options: string[]; selected: string | string[]; title: string }) {
  const selectedValues = Array.isArray(selected) ? selected : [selected];
  return (
    <div>
      <p className="mb-2 font-semibold">{title}:</p>
      <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
        {options.map((option) => (
          <span key={option} className="flex items-start gap-1.5 leading-tight">
            <span className="mt-0.5 flex h-3 w-3 shrink-0 items-center justify-center border border-slate-600 text-[9px]">{selectedValues.includes(option) ? 'x' : ''}</span>
            {option}
          </span>
        ))}
      </div>
    </div>
  );
}

function PrintLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-3">
      <span className="min-w-44 font-semibold">{label}:</span>
      <span className="min-h-7 flex-1 border-b border-slate-500 px-2">{value}</span>
    </div>
  );
}

function SignatureLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-2 font-semibold">{label}:</p>
      <p className="min-h-8 border-b border-slate-700 px-2">{value}</p>
    </div>
  );
}