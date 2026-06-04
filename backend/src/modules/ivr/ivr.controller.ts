/**
 * IVR Controller
 * ==============
 * HTTP handlers for Twilio IVR webhooks.
 */

import type { Request, Response, NextFunction } from "express";
import {
  generateErrorTwiML,
  generateMediaStreamTwiML,
  generateGatherTwiML,
  generateFinalTwiML,
  getMediaStreamUrl,
} from "./twilio.utils.js";
import {
  getConversationState,
  createConversationState,
  updateConversationState,
  clearConversationState,
  getServicesForIVR,
  getAvailableSlotsForIVR,
  formatSlotsForVoice,
  findSlotByTime,
  parseDateFromInput,
  createBookingFromIntent,
  extractBookingIntent,
  generateSystemPrompt,
} from "./ivr.service.js";
import type { TwilioWebhookPayload, TwilioGatherPayload } from "./ivr.types.js";

// ============================================
// INCOMING CALL HANDLER
// ============================================

/**
 * Handle incoming call from Twilio
 * POST /api/ivr/incoming-call
 */
export async function handleIncomingCall(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload = req.body as TwilioWebhookPayload;
    const callSid = payload.CallSid;
    const from = payload.From;

    console.log(`[IVR] 📞 Incoming call from: ${from}`);
    console.log(`[IVR] CallSid: ${callSid}`);

    if (!callSid) {
      res.type("text/xml").send(generateErrorTwiML("Invalid call request"));
      return;
    }

    // Initialize conversation state
    createConversationState(callSid, from);

    // Get base URL for action URL
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const baseUrl = process.env.IVR_WEBHOOK_URL || `${protocol}://${host}`;

    // Check if Media Streams is configured
    const mediaStreamWsUrl = process.env.MEDIA_STREAM_WS_URL;

    let twiml: string;

    if (mediaStreamWsUrl) {
      // Use Media Streams with Gemini Live API
      try {
        const streamUrl = getMediaStreamUrl(baseUrl, callSid, from);

        if (!streamUrl.startsWith("wss://")) {
          throw new Error(`Invalid WebSocket URL: ${streamUrl}`);
        }

        console.log(`[IVR] Media Streams enabled - URL: ${streamUrl}`);
        twiml = generateMediaStreamTwiML(callSid, streamUrl);
      } catch (streamError) {
        console.error(
          "[IVR] Media Stream error, falling back to Gather:",
          streamError
        );

        // Fallback to Gather
        const gatherUrl = `${baseUrl}/api/ivr/gather`;
        const greeting =
          "Hello! I can help you book an appointment. What service would you like?";
        twiml = generateGatherTwiML(callSid, greeting, gatherUrl);
      }
    } else {
      // Use Gather for speech recognition
      console.log(`[IVR] Media Streams not configured, using Gather`);
      const gatherUrl = `${baseUrl}/api/ivr/gather`;
      const greeting =
        "Hello! I can help you book an appointment. What service would you like?";
      twiml = generateGatherTwiML(callSid, greeting, gatherUrl);
    }

    res.type("text/xml").send(twiml);
  } catch (error) {
    console.error("[IVR] Error handling incoming call:", error);
    res
      .type("text/xml")
      .send(
        generateErrorTwiML(
          "We're experiencing technical difficulties. Please try again later."
        )
      );
  }
}

// ============================================
// GATHER HANDLER (Speech/DTMF Input)
// ============================================

/**
 * Handle speech/DTMF input from Twilio Gather
 * POST /api/ivr/gather
 */
export async function handleGather(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload = req.body as TwilioGatherPayload;
    const callSid = payload.CallSid;
    const from = payload.From;
    const speechResult = payload.SpeechResult;
    const digits = payload.Digits;

    console.log(`[IVR Gather] 📞 CallSid: ${callSid}, From: ${from}`);
    console.log(
      `[IVR Gather] Speech: "${speechResult || ""}", Digits: "${digits || ""}"`
    );

    if (!callSid) {
      res.type("text/xml").send(generateFinalTwiML("Invalid call request"));
      return;
    }

    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const baseUrl = process.env.IVR_WEBHOOK_URL || `${protocol}://${host}`;
    const gatherUrl = `${baseUrl}/api/ivr/gather`;

    const userInput = speechResult || digits || "";

    // Get or create conversation state
    let state = getConversationState(callSid);
    if (!state) {
      state = createConversationState(callSid, from);
    }

    // No input received
    if (!userInput) {
      const greeting =
        "I didn't catch that. What service would you like to book?";
      res
        .type("text/xml")
        .send(generateGatherTwiML(callSid, greeting, gatherUrl));
      return;
    }

    // Add user message to conversation
    state.messages.push({ role: "user", content: userInput });
    updateConversationState(callSid, { messages: state.messages });

    // Get available services
    const services = await getServicesForIVR();

    // Extract booking intent from conversation
    const extractedIntent = await extractBookingIntent(
      callSid,
      state.messages,
      services
    );

    // Merge with existing intent
    state.bookingIntent = {
      ...state.bookingIntent,
      ...extractedIntent,
      userName: extractedIntent.userName || state.bookingIntent.userName,
    };
    updateConversationState(callSid, { bookingIntent: state.bookingIntent });

    // Check for confirmation
    const hasAllRequiredFields =
      state.bookingIntent.serviceId &&
      state.bookingIntent.date &&
      state.bookingIntent.time &&
      state.bookingIntent.userName;

    const userConfirmed =
      userInput.toLowerCase().includes("yes") ||
      userInput.toLowerCase().includes("confirm") ||
      userInput.toLowerCase().includes("proceed") ||
      userInput.toLowerCase().includes("book it");

    if (hasAllRequiredFields && userConfirmed) {
      state.bookingIntent.confirmed = true;
      updateConversationState(callSid, { bookingIntent: state.bookingIntent });
    }

    // Process booking if confirmed
    if (state.bookingIntent.confirmed) {
      const bookingResult = await createBookingFromIntent(
        state.bookingIntent,
        callSid,
        from
      );

      if (bookingResult.success) {
        const confirmation = `Great! ${bookingResult.message} Thank you for calling!`;
        clearConversationState(callSid);
        res.type("text/xml").send(generateFinalTwiML(confirmation));
        return;
      } else {
        const errorMsg = `I'm sorry, ${bookingResult.error}. Please try again.`;
        state.bookingIntent.confirmed = false;
        updateConversationState(callSid, {
          bookingIntent: state.bookingIntent,
        });
        res
          .type("text/xml")
          .send(generateGatherTwiML(callSid, errorMsg, gatherUrl));
        return;
      }
    }

    // Generate response based on what's missing
    let response: string;

    if (!state.bookingIntent.serviceId) {
      // Need service
      const serviceNames = services
        .slice(0, 3)
        .map((s) => s.title)
        .join(", ");
      response = `Which service would you like? We offer ${serviceNames}, and more.`;
    } else if (!state.bookingIntent.date) {
      // Need date
      response =
        "What date would you like to book? You can say today, tomorrow, or a specific date.";
    } else if (!state.bookingIntent.time) {
      // Need time - show available slots
      const date = parseDateFromInput(state.bookingIntent.date);
      if (date) {
        const slots = await getAvailableSlotsForIVR(
          state.bookingIntent.serviceId,
          date
        );
        response =
          formatSlotsForVoice(slots, date) + " Which time works for you?";
      } else {
        response = "What time would you like to book?";
      }
    } else if (!state.bookingIntent.userName) {
      // Need name
      response = "What name should I book the appointment under?";
    } else {
      // Have all info, ask for confirmation
      const service = services.find(
        (s) => s.id === state?.bookingIntent.serviceId
      );
      const serviceName = service?.title || "the service";
      response = `Perfect! I have ${serviceName} on ${state.bookingIntent.date} at ${state.bookingIntent.time} for ${state.bookingIntent.userName}. Should I confirm this booking?`;
    }

    // Add assistant response to conversation
    state.messages.push({ role: "assistant", content: response });
    updateConversationState(callSid, { messages: state.messages });

    res
      .type("text/xml")
      .send(generateGatherTwiML(callSid, response, gatherUrl));
  } catch (error) {
    console.error("[IVR Gather] Error:", error);
    res
      .type("text/xml")
      .send(
        generateFinalTwiML(
          "I'm sorry, we're experiencing technical difficulties. Please try again later."
        )
      );
  }
}

// ============================================
// CALL STATUS HANDLER
// ============================================

/**
 * Handle call status updates from Twilio
 * POST /api/ivr/status
 */
export async function handleCallStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const callSid = req.body.CallSid;
    const callStatus = req.body.CallStatus;

    console.log(`[IVR Status] CallSid: ${callSid}, Status: ${callStatus}`);

    // Clean up conversation state when call ends
    if (
      callStatus === "completed" ||
      callStatus === "failed" ||
      callStatus === "busy" ||
      callStatus === "no-answer"
    ) {
      clearConversationState(callSid);
      console.log(`[IVR Status] Cleaned up state for ${callSid}`);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("[IVR Status] Error:", error);
    res.status(200).send("OK"); // Always return 200 for status callbacks
  }
}

// ============================================
// SYSTEM PROMPT ENDPOINT
// ============================================

/**
 * Get system prompt for IVR
 * GET /api/ivr/system-prompt
 */
export async function getSystemPromptHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const systemPrompt = await generateSystemPrompt();
    res.json({ systemPrompt });
  } catch (error) {
    console.error("[IVR] Error getting system prompt:", error);
    res.status(500).json({ error: "Failed to generate system prompt" });
  }
}
