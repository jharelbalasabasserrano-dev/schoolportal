import { PortalRequest, MessageAttachment } from '../../types';
import { getFacilityBookingPrintHtml, getRegistrarRequestPrintHtml, getExitClearancePrintHtml, getLeaveApplicationPrintHtml } from './PrintForms';

export const messageAttachmentCache = new Map<string, MessageAttachment>();

export function printHtmlDocument(html: string) {
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.setAttribute('aria-hidden', 'true');
  document.body.appendChild(frame);

  const frameWindow = frame.contentWindow;
  const frameDocument = frame.contentDocument ?? frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    document.body.removeChild(frame);
    return;
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  window.setTimeout(() => {
    frameWindow.focus();
    frameWindow.print();
    window.setTimeout(() => {
      if (frame.parentNode) frame.parentNode.removeChild(frame);
    }, 500);
  }, 250);
}

export function printFacilityBookingForm(request: PortalRequest) {
  printHtmlDocument(getFacilityBookingPrintHtml(request));
}

export function printRegistrarRequestForm(request: PortalRequest) {
  printHtmlDocument(getRegistrarRequestPrintHtml(request));
}

export function printDocumentRequestForm(request: PortalRequest) {
  if (request.kind === 'Exit Clearance') printHtmlDocument(getExitClearancePrintHtml(request));
  else printRegistrarRequestForm(request);
}

export function printLeaveApplicationForm(request: PortalRequest) {
  printHtmlDocument(getLeaveApplicationPrintHtml(request));
}

export function printMessageAttachment(attachment: MessageAttachment) {
  if (attachment.type.startsWith('image/')) {
    printHtmlDocument(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(attachment.name)}</title>
  <style>
    @page { margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", sans-serif; color: #0f172a; }
    h1 { margin: 0 0 14px; font-size: 16px; }
    img { display: block; max-width: 100%; max-height: calc(100vh - 50px); margin: 0 auto; object-fit: contain; }
  </style>
</head>
<body>
  <h1>${escapeHtml(attachment.name)}</h1>
  <img src="${attachment.dataUrl}" alt="${escapeHtml(attachment.name)}">
</body>
</html>`);
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.alert('Please allow pop-ups so the attachment can open for printing.');
    return;
  }

  const printableContent = attachment.type === 'application/pdf'
    ? <embed src="${attachment.dataUrl}" type="application/pdf" class="document">
    : `<div class="fallback">
        <p>This file type may not print directly in the browser.</p>
        <a href="${attachment.dataUrl}" download="${escapeHtml(attachment.name)}">Download ${escapeHtml(attachment.name)}</a>
      </div>`;

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(attachment.name)}</title>
  <style>
    html, body { margin: 0; min-height: 100%; font-family: "Segoe UI", sans-serif; color: #0f172a; }
    .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 16px; border-bottom: 1px solid #d9d3cc; }
    .toolbar strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    button, a { border: 0; border-radius: 6px; background: #228b22; color: white; cursor: pointer; font: inherit; font-weight: 700; padding: 9px 14px; text-decoration: none; }
    .document { display: block; width: 100%; height: calc(100vh - 58px); border: 0; }
    .fallback { padding: 32px; font-size: 18px; }
    @media print {
      .toolbar { display: none; }
      .document { height: 100vh; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <strong>${escapeHtml(attachment.name)}</strong>
    <button onclick="window.print()">Print</button>
  </div>
  ${printableContent}
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 500)
    })
  </script>
</body>
</html>`);
  printWindow.document.close();
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}