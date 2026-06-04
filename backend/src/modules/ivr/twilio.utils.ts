/**
 * Twilio Utility Functions
 * ========================
 * Helper functions for Twilio integration including TwiML generation.
 */

import twilio from "twilio";

let twilioClient: twilio.Twilio | null = null;

/**
 * Get or create Twilio client instance
 */
export function getTwilioClient(): twilio.Twilio {
  if (twilioClient) {
    return twilioClient;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error(
      "Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN"
    );
  }

  twilioClient = twilio(accountSid, authToken);
  return twilioClient;
}

/**
 * Escape XML special characters for TwiML
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generate TwiML for error response
 */
export function generateErrorTwiML(message?: string): string {
  const errorMsg =
    message ||
    "We're sorry, but we're experiencing technical difficulties. Please try again later.";
  const escapedMsg = escapeXml(errorMsg);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapedMsg}</Say>
  <Hangup />
</Response>`;
}

/**
 * Generate TwiML for Media Streams (real-time audio streaming with Gemini)
 */
export function generateMediaStreamTwiML(
  callSid: string,
  streamUrl: string
): string {
  const escapedUrl = escapeXml(streamUrl);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${escapedUrl}" />
  </Connect>
</Response>`;
}

/**
 * Generate TwiML for Gather (speech/DTMF input collection)
 */
export function generateGatherTwiML(
  callSid: string,
  message: string,
  actionUrl: string
): string {
  const escapedMessage = escapeXml(message);
  const escapedUrl = escapeXml(actionUrl);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapedMessage}</Say>
  <Gather 
    input="speech dtmf" 
    action="${escapedUrl}" 
    method="POST"
    speechTimeout="3"
    language="en-US"
    enhanced="true"
    hints="book appointment, check availability, schedule, cancel, today, tomorrow, morning, afternoon, evening, haircut, massage, consultation"
    numDigits="1"
    timeout="15"
    finishOnKey="#"
  />
  <Say voice="Polly.Joanna">I didn't catch that. Please try again.</Say>
  <Redirect>${escapedUrl}</Redirect>
</Response>`;
}

/**
 * Generate final TwiML (end call with message)
 */
export function generateFinalTwiML(message: string): string {
  const escapedMessage = escapeXml(message);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapedMessage}</Say>
  <Say voice="Polly.Joanna">Thank you for calling. Goodbye.</Say>
  <Hangup />
</Response>`;
}

/**
 * Generate TwiML to stop Media Stream
 */
export function generateStopStreamTwiML(message?: string): string {
  const sayTag = message
    ? `<Say voice="Polly.Joanna">${escapeXml(message)}</Say>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Stop>
    <Stream />
  </Stop>
  ${sayTag}
  <Hangup />
</Response>`;
}

/**
 * Generate TwiML for hangup
 */
export function generateHangupTwiML(message?: string): string {
  if (message) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${escapeXml(message)}</Say>
  <Hangup />
</Response>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup />
</Response>`;
}

/**
 * Get call information from Twilio
 */
export async function getCallInfo(callSid: string) {
  try {
    const client = getTwilioClient();
    const call = await client.calls(callSid).fetch();
    return call;
  } catch (error) {
    console.error("[IVR] Error fetching call info:", error);
    return null;
  }
}

/**
 * End a call
 */
export async function endCall(callSid: string): Promise<boolean> {
  try {
    const client = getTwilioClient();
    await client.calls(callSid).update({ status: "completed" });
    return true;
  } catch (error) {
    console.error("[IVR] Error ending call:", error);
    return false;
  }
}

/**
 * Get Media Stream WebSocket URL for Twilio
 */
export function getMediaStreamUrl(
  baseUrl: string,
  callSid: string,
  from: string
): string {
  const wsServerUrl = process.env.MEDIA_STREAM_WS_URL;

  if (!wsServerUrl) {
    throw new Error("MEDIA_STREAM_WS_URL environment variable is not set");
  }

  let trimmedUrl = wsServerUrl.trim();

  // Remove port number if present (ngrok handles this)
  trimmedUrl = trimmedUrl.replace(/:\d+$/, "");

  // Ensure it uses wss:// for secure connections
  if (trimmedUrl.startsWith("ws://")) {
    trimmedUrl = trimmedUrl.replace("ws://", "wss://");
  }

  if (!trimmedUrl.startsWith("wss://")) {
    throw new Error(
      `MEDIA_STREAM_WS_URL must start with wss:// (secure WebSocket required), got: ${trimmedUrl}`
    );
  }

  // Remove trailing slash if present
  const cleanUrl = trimmedUrl.replace(/\/$/, "");

  // Build WebSocket URL with path and query parameters
  // CRITICAL: Must include the path that the WebSocket server is listening on!
  const streamUrl = `${cleanUrl}/api/ivr/media-stream?callSid=${encodeURIComponent(
    callSid
  )}&from=${encodeURIComponent(from || "")}`;

  return streamUrl;
}

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");

  // Handle Indian numbers
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return `+${cleaned}`;
  }

  // If it's a 10-digit number, assume it's an Indian number
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  // If already has country code
  if (cleaned.length > 10) {
    return `+${cleaned}`;
  }

  return phone; // Return original if we can't normalize
}
