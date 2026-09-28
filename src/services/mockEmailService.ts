import { BillRecord } from '../types/room';

export interface EmailInvoicePayload {
  recipientEmail: string;
  tenantName: string;
  roomNumber: string;
  monthYear: string;
  bill: BillRecord;
  senderName?: string;
  notes?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  recipient: string;
  subject: string;
  sentAt: string;
  deliveryStatus: 'Sent' | 'Delivered' | 'Failed';
  previewHtml?: string;
  error?: string;
}

const EMAIL_OUTBOX_STORAGE_KEY = 'skyline_mock_email_outbox';

/**
 * Mock API Service to simulate sending digital invoice emails to tenants.
 * Includes latency simulation, email formatting validation, and an outbox audit trail.
 */
export async function sendInvoiceEmailMock(payload: EmailInvoicePayload): Promise<EmailSendResult> {
  const { recipientEmail, tenantName, roomNumber, monthYear, bill } = payload;

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!recipientEmail || !emailRegex.test(recipientEmail.trim())) {
    return {
      success: false,
      recipient: recipientEmail,
      subject: '',
      sentAt: new Date().toISOString(),
      deliveryStatus: 'Failed',
      error: 'အီးမေးလ်လိပ်စာ မှားယွင်းနေပါသည်။ (Invalid email address format)',
    };
  }

  // Simulate network latency (800ms - 1200ms)
  const delay = Math.floor(Math.random() * 400) + 800;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const messageId = `msg_inv_${roomNumber}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const sentAt = new Date().toISOString();
  const subject = `[Skyline Residence] Digital Invoice & Utility Bill - Room ${roomNumber} (${monthYear})`;

  const result: EmailSendResult = {
    success: true,
    messageId,
    recipient: recipientEmail.trim(),
    subject,
    sentAt,
    deliveryStatus: 'Delivered',
    previewHtml: `
Dear ${tenantName},

Here is your monthly invoice for Skyline Residence - Room ${roomNumber} (${monthYear}):
- Electricity: ${bill.electricTotal.toLocaleString()} THB (${bill.electricDiff} units)
- Water: ${bill.waterTotal.toLocaleString()} THB (${bill.waterDiff} units)
- Room Rent: ${bill.roomRent.toLocaleString()} THB
- Common Fee: ${bill.commonFee.toLocaleString()} THB
-----------------------------------------------
TOTAL DUE: ${bill.grandTotal.toLocaleString()} THB
Status: ${bill.status}

Thank you for choosing Skyline Residence.
    `.trim(),
  };

  // Save to mock email outbox in localStorage for auditing
  try {
    const existing = localStorage.getItem(EMAIL_OUTBOX_STORAGE_KEY);
    const list = existing ? JSON.parse(existing) : [];
    list.unshift({
      ...result,
      roomNumber,
      tenantName,
      monthYear,
      amount: bill.grandTotal,
    });
    // Keep last 30 mock sent emails
    localStorage.setItem(EMAIL_OUTBOX_STORAGE_KEY, JSON.stringify(list.slice(0, 30)));
  } catch (err) {
    console.warn('Could not store to mock email outbox', err);
  }

  return result;
}

/**
 * Retrieve simulated sent email history from the mock API outbox
 */
export function getMockEmailOutbox(): any[] {
  try {
    const existing = localStorage.getItem(EMAIL_OUTBOX_STORAGE_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch {
    return [];
  }
}
