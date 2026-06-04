/**
 * WhatsApp Service
 * ================
 * WHAPI integration for sending WhatsApp notifications.
 * Used for booking confirmations and reminders.
 */

const WHAPI_BASE_URL = 'https://gate.whapi.cloud/messages/text';
const WHAPI_TOKEN = process.env.WHAPI_TOKEN;

interface WhatsAppMessageParams {
  to: string;  // Phone number with country code (e.g., '917823882851')
  body: string;
}

/**
 * Send a WhatsApp text message
 */
async function sendWhatsAppMessage({ to, body }: WhatsAppMessageParams): Promise<boolean> {
  if (!WHAPI_TOKEN) {
    console.warn('⚠️ WHAPI_TOKEN not configured - skipping WhatsApp message');
    return false;
  }

  // Format phone number - remove any non-numeric characters and ensure no + prefix
  const formattedPhone = to.replace(/\D/g, '');
  
  if (!formattedPhone || formattedPhone.length < 10) {
    console.warn('⚠️ Invalid phone number for WhatsApp:', to);
    return false;
  }

  try {
    const response = await fetch(WHAPI_BASE_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WHAPI_TOKEN}`,
      },
      body: JSON.stringify({
        to: formattedPhone,
        body,
      }),
    });

    const data = await response.json() as { message?: { id?: string }; error?: string };

    if (response.ok) {
      console.log('✅ WhatsApp message sent successfully:', {
        to: formattedPhone,
        messageId: data.message?.id,
      });
      return true;
    } else {
      console.error('❌ WhatsApp API error:', {
        status: response.status,
        error: data,
      });
      return false;
    }
  } catch (error: any) {
    console.error('❌ Failed to send WhatsApp message:', {
      to: formattedPhone,
      error: error.message,
    });
    return false;
  }
}

interface BookingConfirmationWhatsAppParams {
  phone: string;
  name: string;
  serviceName: string;
  date: string;
  time: string;
  amount: string;
  paymentMode: string;
  bookingId: string;
}

/**
 * Send booking confirmation via WhatsApp
 */
export async function sendBookingConfirmationWhatsApp(params: BookingConfirmationWhatsAppParams): Promise<boolean> {
  const { phone, name, serviceName, date, time, amount, paymentMode, bookingId } = params;

  const message = `🎉 *Booking Confirmed!*

Hi ${name},

Your appointment has been successfully booked.

📋 *Booking Details:*
• Service: ${serviceName}
• Date: ${date}
• Time: ${time}
• Amount: ${amount}
• Payment: ${paymentMode === 'CASH' ? 'Cash on Arrival' : 'Paid Online'}

📝 Booking ID: ${bookingId}

Thank you for choosing Bookify! We look forward to seeing you.

_This is an automated message from Bookify._`;

  return sendWhatsAppMessage({ to: phone, body: message });
}

/**
 * Send booking reminder via WhatsApp
 */
export async function sendBookingReminderWhatsApp(
  phone: string,
  name: string,
  serviceName: string,
  date: string,
  time: string
): Promise<boolean> {
  const message = `⏰ *Appointment Reminder*

Hi ${name},

This is a reminder for your upcoming appointment:

📋 *Details:*
• Service: ${serviceName}
• Date: ${date}
• Time: ${time}

We look forward to seeing you!

_This is an automated message from Bookify._`;

  return sendWhatsAppMessage({ to: phone, body: message });
}
