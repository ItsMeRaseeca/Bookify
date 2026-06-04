/**
 * Media Stream WebSocket Server for Gemini Live API
 * =================================================
 * Standalone WebSocket server for handling Twilio Media Streams
 * with real-time audio streaming to/from Gemini Live API.
 *
 * Run: npm run ivr:media-server
 */

import "dotenv/config";
import WebSocket, { WebSocketServer } from "ws";
import { GoogleGenAI, Modality } from "@google/genai";
// @ts-expect-error: 'alawmulaw' has no type declarations
import * as alawmulaw from "alawmulaw";

// Extract mulaw from the module (matches the original CommonJS: const { mulaw } = require("alawmulaw"))
// Handle both ESM and CommonJS module structures
const mulaw =
  (alawmulaw as any).mulaw || (alawmulaw as any).default?.mulaw || alawmulaw;

import type {
  MediaStreamConnection,
  TwilioMediaStreamMessage,
} from "./ivr.types.js";
import {
  getServicesForIVR,
  getAvailableSlotsForIVR,
  findServiceByTitle,
  createBookingFromIntent,
  formatTimeForVoice,
} from "./ivr.service.js";
import { format, addDays, startOfDay } from "date-fns";

const PORT = parseInt(process.env.MEDIA_STREAM_PORT || "8085", 10);

// ============================================
// TOOL DEFINITIONS FOR GEMINI LIVE
// ============================================

/**
 * Tool declarations for Gemini Live API
 * These allow Gemini to call our backend functions
 */
const toolDeclarations = [
  {
    name: "list_services",
    description:
      "Get all available services that can be booked. Call this when user asks what services are available or wants to know booking options.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "check_availability",
    description:
      "Check available time slots for a specific service on a specific date. Call this when user wants to know available times.",
    parameters: {
      type: "object",
      properties: {
        serviceName: {
          type: "string",
          description: "Name of the service to check availability for",
        },
        date: {
          type: "string",
          description:
            "Date to check availability for. Use 'today', 'tomorrow', or a specific date like '2024-01-15'",
        },
      },
      required: ["serviceName", "date"],
    },
  },
  {
    name: "book_appointment",
    description:
      "Book an appointment for a service at a specific date and time. Only call this when user confirms they want to book.",
    parameters: {
      type: "object",
      properties: {
        serviceName: {
          type: "string",
          description: "Name of the service to book",
        },
        date: {
          type: "string",
          description:
            "Date of the appointment. Use 'today', 'tomorrow', or a specific date",
        },
        time: {
          type: "string",
          description:
            "Time of the appointment (e.g., '10:00 AM', '14:30', '2 pm')",
        },
        userName: {
          type: "string",
          description: "Name of the person booking the appointment",
        },
      },
      required: ["serviceName", "date", "time", "userName"],
    },
  },
];

/**
 * Execute a tool call and return the result
 */
async function executeToolCall(
  toolName: string,
  args: Record<string, any>,
  callerPhone: string
): Promise<string> {
  console.log(`[Tool Call] Executing: ${toolName}`, args);

  try {
    switch (toolName) {
      case "list_services": {
        const services = await getServicesForIVR();
        if (services.length === 0) {
          return "No services are currently available for booking.";
        }
        const serviceList = services
          .map((s, i) => `${i + 1}. ${s.title} - ₹${s.price} (${s.category})`)
          .join("\n");
        return `Available services:\n${serviceList}`;
      }

      case "check_availability": {
        const { serviceName, date } = args;

        // Find service
        const service = await findServiceByTitle(serviceName);
        if (!service) {
          const allServices = await getServicesForIVR();
          const names = allServices.map((s) => s.title).join(", ");
          return `Service "${serviceName}" not found. Available services: ${names}`;
        }

        // Parse date
        const targetDate = parseDate(date);
        if (!targetDate) {
          return `Could not understand the date "${date}". Please say today, tomorrow, or a specific date.`;
        }

        // Get slots
        const slots = await getAvailableSlotsForIVR(service.id, targetDate);
        if (slots.length === 0) {
          const dateStr = format(targetDate, "EEEE, MMMM d");
          return `No available slots for ${service.title} on ${dateStr}. Try another date.`;
        }

        const dateStr = format(targetDate, "EEEE, MMMM d");
        const slotList = slots
          .slice(0, 6)
          .map((s) => formatTimeForVoice(s.startTime))
          .join(", ");
        return `Available times for ${service.title} on ${dateStr}: ${slotList}`;
      }

      case "book_appointment": {
        const { serviceName, date, time, userName } = args;

        // Find service
        const service = await findServiceByTitle(serviceName);
        if (!service) {
          return `Service "${serviceName}" not found. Please check the service name.`;
        }

        // Create booking
        const result = await createBookingFromIntent(
          {
            serviceId: service.id,
            date: date,
            time: time,
            userName: userName,
            confirmed: true,
          },
          `tool_${Date.now()}`,
          callerPhone
        );

        if (result.success) {
          return (
            result.message ||
            `Booking confirmed! Your appointment for ${service.title} is scheduled. Booking ID: ${result.bookingId}`
          );
        } else {
          return `Booking failed: ${result.error}`;
        }
      }

      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (error: any) {
    console.error(`[Tool Call] Error executing ${toolName}:`, error);
    return `Error: ${error.message || "Something went wrong"}`;
  }
}

/**
 * Parse natural language date
 */
function parseDate(input: string): Date | null {
  const normalized = input.toLowerCase().trim();
  const today = startOfDay(new Date());

  if (normalized === "today" || normalized.includes("today")) {
    return today;
  }
  if (normalized === "tomorrow" || normalized.includes("tomorrow")) {
    return addDays(today, 1);
  }

  // Day names
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  for (let i = 0; i < dayNames.length; i++) {
    if (normalized.includes(dayNames[i]!)) {
      let daysToAdd = (i - today.getDay() + 7) % 7;
      if (daysToAdd === 0) daysToAdd = 7;
      return addDays(today, daysToAdd);
    }
  }

  // Try parsing as date
  try {
    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) {
      return startOfDay(parsed);
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Generate system prompt optimized for tool calling
 */
async function generateSystemPromptWithTools(): Promise<string> {
  const now = new Date();
  const today = format(now, "EEEE, MMMM d, yyyy");
  const currentTime = format(now, "h:mm a");

  return `You are a fast, efficient appointment booking assistant. Today is ${today}, current time is ${currentTime}.

CRITICAL: You have access to real-time tools. ALWAYS use them:
- list_services: Get available services. Call this FIRST when user asks about booking.
- check_availability: Get actual available slots for a service on a date.
- book_appointment: Make a real booking (only when user confirms).

WORKFLOW:
1. User wants to book → Call list_services to show what's available
2. User picks a service and date → Call check_availability to get REAL slots
3. User picks a time → Confirm details with user
4. User confirms → Call book_appointment to create the booking

RULES:
- NEVER make up times or dates. Always call check_availability for real data.
- Keep responses SHORT (1-2 sentences max).
- Skip pleasantries after the first greeting.
- Payment is cash on arrival.
- Phone is automatically captured from caller ID.
- Be fast and direct.

Start with: "Hello! I can help you book. What service would you like?"`;
}

const activeConnections = new Map<string, MediaStreamConnection>();

/**
 * Start the Media Stream WebSocket Server
 */
export async function startMediaStreamServer(
  port: number = PORT
): Promise<WebSocketServer> {
  const wss = new WebSocketServer({ port, path: "/api/ivr/media-stream" });

  console.log(`[Media Stream Server] Starting on port ${port}`);

  wss.on("connection", async (ws, req) => {
    let callSid = "";
    let from = "";
    let connectionTimeout: NodeJS.Timeout | null = null;

    console.log(
      `[Media Stream] 🔌 WebSocket connection received from ${req.socket.remoteAddress}`
    );

    try {
      // Try to get callSid from URL query parameters
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      callSid = url.searchParams.get("callSid") || "";
      from = url.searchParams.get("from") || "";

      console.log(`[Media Stream] 🔌 New WebSocket connection attempt`);
      console.log(`[Media Stream] CallSid from URL: ${callSid || "MISSING"}`);
      console.log(`[Media Stream] From: ${from || "unknown"}`);

      // Set connection timeout
      connectionTimeout = setTimeout(() => {
        if (ws.readyState === ws.OPEN) {
          console.error(
            `[Media Stream] ⏱️ Connection timeout - no messages received`
          );
          ws.close(1008, "Connection timeout");
        }
      }, 30000);

      // Initialize Gemini Live API
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("[Media Stream] GEMINI_API_KEY not configured");
        ws.close(1011, "Server configuration error");
        return;
      }

      const ai = new GoogleGenAI({ apiKey });

      // Generate system prompt with database context
      const systemPrompt = await generateSystemPromptWithTools();

      // Gemini Live API configuration with tool calling
      const model = "gemini-2.5-flash-native-audio-preview-12-2025";
      const config = {
        responseModalities: [Modality.AUDIO],
        systemInstruction: systemPrompt,
        // Enable tool calling - Gemini will call these functions for real data
        tools: [{ functionDeclarations: toolDeclarations }],
      } as any;

      // Create connection object
      const connection: MediaStreamConnection = {
        ws: ws as any,
        callSid: callSid || "",
        streamSid: "",
        from,
        geminiSession: null,
        audioBuffer: Buffer.alloc(0),
        audioQueueOutput: [],
        isGeminiConnected: false,
        isStreamReady: false,
        playbackInterval: null,
        mulawBuffer: Buffer.alloc(0),
        sequenceNumber: 1,
        lastAudioTimestamp: 0,
        audioFlushTimeout: null,
        lastAudioReceivedTime: 0,
        lastAudioSentTime: 0,
        lastUserSpeechEndTime: 0,
      };

      // Store connection
      if (callSid) {
        activeConnections.set(callSid, connection);
      } else {
        const tempKey = `ws_${Date.now()}`;
        activeConnections.set(tempKey, connection);
        console.log(
          `[Media Stream] Stored connection with temp key: ${tempKey}`
        );
      }

      // Connect to Gemini Live API
      try {
        // NOTE: onopen callback fires DURING ai.live.connect(), before it returns
        // So we cannot reference geminiSession inside onopen - it's in the temporal dead zone
        const geminiSession = await ai.live.connect({
          model,
          config,
          callbacks: {
            onopen: () => {
              console.log(`[Gemini Live] ✅ Connected`);
              connection.isGeminiConnected = true;
              // Don't assign geminiSession here - it doesn't exist yet!
              // We assign it after connect() returns (below)
              console.log(`[Gemini Live] Waiting for stream to be ready...`);
            },
            onmessage: (message: any) => {
              handleGeminiMessage(connection, message);
            },
            onerror: (error: any) => {
              console.error(`[Gemini Live] Error:`, error.message || error);
            },
            onclose: (event: any) => {
              console.log(
                `[Gemini Live] Closed:`,
                event.reason || "Connection closed"
              );
              connection.isGeminiConnected = false;
            },
          },
        });

        // Assign session AFTER connect() returns (onopen already fired by now)
        connection.geminiSession = geminiSession;
        console.log(`[Gemini Live] Session created and assigned to connection`);
      } catch (error: any) {
        console.error(`[Gemini Live] Failed to connect:`, error);
        ws.close(1011, "Failed to connect to Gemini Live API");
        return;
      }

      // Handle Twilio Media Stream messages
      ws.on("message", async (data) => {
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }

        try {
          const message: TwilioMediaStreamMessage = JSON.parse(data.toString());
          await handleTwilioMessage(connection, message, ws);
        } catch (error) {
          console.error(`[Media Stream] Error processing message:`, error);
        }
      });

      ws.on("close", () => {
        console.log(
          `[Media Stream] Connection closed: ${connection.callSid || "unknown"}`
        );
        cleanupConnection(connection, connectionTimeout);
      });

      ws.on("error", (error) => {
        console.error(`[Media Stream] ❌ WebSocket error:`, error);
        cleanupConnection(connection, connectionTimeout);
      });
    } catch (error: any) {
      console.error(`[Media Stream] ❌ Error setting up connection:`, error);
      if (connectionTimeout) clearTimeout(connectionTimeout);
      if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) {
        ws.close(1011, "Server error during connection setup");
      }
    }
  });

  console.log(
    `[Media Stream Server] Ready on ws://localhost:${port}/api/ivr/media-stream`
  );
  console.log(`[Media Stream Server] Make sure GEMINI_API_KEY is set`);

  return wss;
}

/**
 * Handle messages from Gemini Live API
 * Now includes tool call handling
 */
async function handleGeminiMessage(
  connection: MediaStreamConnection,
  message: any
) {
  try {
    // Handle interruption
    if (message.serverContent?.interrupted) {
      connection.audioQueueOutput.length = 0;
      return;
    }

    // Handle tool calls from Gemini
    if (message.toolCall) {
      console.log(
        `[Gemini Live] 🔧 Tool call received:`,
        JSON.stringify(message.toolCall)
      );
      await handleToolCall(connection, message.toolCall);
      return;
    }

    // Also check for tool calls in serverContent
    if (message.serverContent?.modelTurn?.parts) {
      for (const part of message.serverContent.modelTurn.parts) {
        if (part.functionCall) {
          console.log(
            `[Gemini Live] 🔧 Function call in parts:`,
            part.functionCall
          );
          await handleFunctionCall(connection, part.functionCall);
        }
      }
    }

    // Extract audio from Gemini response
    if (message.serverContent?.modelTurn?.parts) {
      const responseStartTime = Date.now();
      if (connection.lastUserSpeechEndTime > 0) {
        const responseDelay =
          responseStartTime - connection.lastUserSpeechEndTime;
        console.log(`[Gemini Live] ⏱️ Response time: ${responseDelay}ms`);
        connection.lastUserSpeechEndTime = 0;
      }

      for (const part of message.serverContent.modelTurn.parts) {
        if (part.inlineData?.data) {
          let audioData = Buffer.from(part.inlineData.data, "base64");

          // Check for double base64 encoding
          if (
            audioData.length > 0 &&
            audioData[0]! >= 43 &&
            audioData[0]! <= 122
          ) {
            const asString = audioData.toString(
              "utf8",
              0,
              Math.min(20, audioData.length)
            );
            if (/^[A-Za-z0-9+/=]+$/.test(asString)) {
              console.log(
                `[Gemini Live] ⚠️ Detected double base64, decoding again...`
              );
              audioData = Buffer.from(audioData.toString(), "base64");
            }
          }

          connection.audioQueueOutput.push(audioData);
          console.log(
            `[Gemini Live] ✅ Received audio chunk: ${audioData.length} bytes`
          );

          // Process and send immediately
          processAndSendAudio(connection);
        }

        // Log text responses
        if (part.text) {
          console.log(`[Gemini Live] Text: ${part.text.substring(0, 100)}`);
        }
      }
    }
  } catch (error) {
    console.error(`[Gemini Live] Error processing message:`, error);
  }
}

/**
 * Handle a tool call from Gemini
 */
async function handleToolCall(
  connection: MediaStreamConnection,
  toolCall: any
) {
  try {
    const functionCalls = toolCall.functionCalls || [];

    for (const fc of functionCalls) {
      const toolName = fc.name;
      const args = fc.args || {};
      const callId = fc.id;

      console.log(`[Tool Call] Executing: ${toolName}`, args);

      // Execute the tool
      const result = await executeToolCall(toolName, args, connection.from);

      console.log(
        `[Tool Call] Result for ${toolName}:`,
        result.substring(0, 100)
      );

      // Send tool response back to Gemini
      if (connection.geminiSession) {
        try {
          connection.geminiSession.sendToolResponse({
            functionResponses: [
              {
                id: callId,
                name: toolName,
                response: { result: result },
              },
            ],
          });
          console.log(`[Tool Call] ✅ Sent response for ${toolName}`);
        } catch (error) {
          console.error(`[Tool Call] Error sending response:`, error);
        }
      }
    }
  } catch (error) {
    console.error(`[Tool Call] Error handling tool call:`, error);
  }
}

/**
 * Handle a function call embedded in message parts
 */
async function handleFunctionCall(
  connection: MediaStreamConnection,
  functionCall: any
) {
  try {
    const toolName = functionCall.name;
    const args = functionCall.args || {};

    console.log(`[Function Call] Executing: ${toolName}`, args);

    // Execute the tool
    const result = await executeToolCall(toolName, args, connection.from);

    console.log(`[Function Call] Result:`, result.substring(0, 100));

    // Send response back to Gemini
    if (connection.geminiSession) {
      try {
        connection.geminiSession.sendToolResponse({
          functionResponses: [
            {
              name: toolName,
              response: { result: result },
            },
          ],
        });
        console.log(`[Function Call] ✅ Sent response for ${toolName}`);
      } catch (error) {
        console.error(`[Function Call] Error sending response:`, error);
      }
    }
  } catch (error) {
    console.error(`[Function Call] Error handling function call:`, error);
  }
}

/**
 * Handle messages from Twilio
 */
async function handleTwilioMessage(
  connection: MediaStreamConnection,
  message: TwilioMediaStreamMessage,
  ws: WebSocket
) {
  switch (message.event) {
    case "connected":
      console.log(`[Media Stream] ✅ Twilio connected`);
      const response = { event: "connected", protocol: "0.0.1" };
      ws.send(JSON.stringify(response));
      break;

    case "start":
      console.log(`[Media Stream] 📥 Received "start" event`);

      const streamCallSid = message.start?.callSid || connection.callSid;
      const streamSid = message.start?.streamSid || "";

      if (streamCallSid && streamCallSid !== connection.callSid) {
        // Update connection with correct callSid
        const oldKey =
          connection.callSid ||
          [...activeConnections.entries()].find(
            ([_, c]) => c.ws === connection.ws
          )?.[0];

        connection.callSid = streamCallSid;

        if (oldKey) {
          activeConnections.delete(oldKey);
        }
        activeConnections.set(streamCallSid, connection);
        console.log(`[Media Stream] ✅ CallSid updated: ${streamCallSid}`);
      }

      if (streamSid) {
        connection.streamSid = streamSid;
        connection.isStreamReady = true;
        console.log(`[Media Stream] ✅ Stream SID: ${streamSid}`);

        // Start playback interval as fallback
        if (!connection.playbackInterval) {
          connection.playbackInterval = setInterval(() => {
            if (connection.mulawBuffer.length >= 160) {
              processAndSendAudio(connection);
            }
          }, 20);
        }

        // Send initial greeting
        if (connection.geminiSession && connection.isGeminiConnected) {
          try {
            console.log(`[Gemini Live] Sending initial greeting`);
            connection.geminiSession.sendRealtimeInput({
              text: "Say hello and ask what service they would like to book.",
            });
          } catch (error) {
            console.error(`[Gemini Live] Error sending greeting:`, error);
          }
        }
      }
      break;

    case "media":
      const audioPayload = message.media?.payload;

      if (!connection._audioReceivedCount) connection._audioReceivedCount = 0;
      connection._audioReceivedCount++;

      if (
        connection._audioReceivedCount <= 5 ||
        connection._audioReceivedCount % 50 === 0
      ) {
        console.log(
          `[Media Stream] 📥 Audio chunk #${connection._audioReceivedCount}`
        );
      }

      if (
        audioPayload &&
        connection.isGeminiConnected &&
        connection.geminiSession
      ) {
        await processTwilioAudio(connection, audioPayload);
      }
      break;

    case "stop":
      console.log(`[Media Stream] Stream stopped: ${connection.callSid}`);

      if (connection.audioBuffer.length > 0) {
        flushAudioBuffer(connection);
      }

      cleanupConnection(connection, null);
      ws.close();
      break;
  }
}

/**
 * Process audio from Twilio and send to Gemini
 */
async function processTwilioAudio(
  connection: MediaStreamConnection,
  audioPayload: string
) {
  try {
    const mulawData = Buffer.from(audioPayload, "base64");
    connection.lastAudioReceivedTime = Date.now();

    if (connection.audioFlushTimeout) {
      clearTimeout(connection.audioFlushTimeout);
      connection.audioFlushTimeout = null;
    }

    connection.audioBuffer = Buffer.concat([connection.audioBuffer, mulawData]);

    const CHUNK_SIZE = 800; // 100ms at 8kHz
    const MIN_CHUNK_SIZE = 200;

    // Send chunks when we have enough data
    while (connection.audioBuffer.length >= CHUNK_SIZE) {
      const chunk = connection.audioBuffer.slice(0, CHUNK_SIZE);
      connection.audioBuffer = connection.audioBuffer.slice(CHUNK_SIZE);

      // Convert mu-law (8kHz) to PCM (16kHz) using proper library
      const pcm16k = convertMulawToPCM16k(chunk);

      // Skip if conversion failed or produced no data
      if (pcm16k.length === 0) {
        console.warn("[Gemini Live] ⚠️ Skipping empty audio chunk");
        continue;
      }

      // Send to Gemini Live API immediately
      // Gemini expects base64 encoded PCM at 16kHz
      const base64PCM = pcm16k.toString("base64");

      if (connection.geminiSession && connection.isGeminiConnected) {
        try {
          connection.geminiSession.sendRealtimeInput({
            audio: {
              data: base64PCM,
              mimeType: "audio/pcm;rate=16000",
            },
          });

          // Log occasionally to track audio flow
          if (!connection._audioSentCount) connection._audioSentCount = 0;
          connection._audioSentCount++;
          if (
            connection._audioSentCount <= 10 ||
            connection._audioSentCount % 50 === 0
          ) {
            console.log(
              `[Gemini Live] ✅ Sent audio chunk #${connection._audioSentCount} to Gemini (${chunk.length} bytes μ-law → ${pcm16k.length} bytes PCM 16kHz)`
            );
          }
        } catch (error) {
          console.error(`[Gemini Live] ❌ Error sending audio:`, error);
        }
      } else {
        console.warn(
          `[Gemini Live] ⚠️ Cannot send audio - session not ready (isGeminiConnected: ${connection.isGeminiConnected})`
        );
      }
    }

    // Also send smaller accumulated chunks (lower threshold for better detection)
    // This helps capture quieter speech or when speaking slowly
    if (
      connection.audioBuffer.length >= MIN_CHUNK_SIZE &&
      connection.audioBuffer.length < CHUNK_SIZE
    ) {
      // Check if we've been accumulating for a while (150ms) - send what we have
      const timeSinceLastSend =
        Date.now() - (connection.lastAudioSentTime || Date.now());
      if (timeSinceLastSend > 150) {
        const smallChunk = connection.audioBuffer;
        connection.audioBuffer = Buffer.alloc(0);

        const pcm16k = convertMulawToPCM16k(smallChunk);

        // Skip if conversion failed
        if (pcm16k.length === 0) {
          return;
        }

        const base64PCM = pcm16k.toString("base64");

        if (connection.geminiSession && connection.isGeminiConnected) {
          try {
            connection.geminiSession.sendRealtimeInput({
              audio: {
                data: base64PCM,
                mimeType: "audio/pcm;rate=16000",
              },
            });
            connection.lastAudioSentTime = Date.now();
            console.log(
              `[Gemini Live] ✅ Sent small audio chunk to Gemini (${smallChunk.length} bytes μ-law → ${pcm16k.length} bytes PCM 16kHz)`
            );
          } catch (error) {
            console.error(`[Gemini Live] ❌ Error sending small chunk:`, error);
          }
        }
      }
    }

    // Set flush timeout for silence detection
    connection.audioFlushTimeout = setTimeout(() => {
      flushAudioBuffer(connection);
      connection.lastUserSpeechEndTime = Date.now();
      console.log(`[Gemini Live] 🎤 User speech ended`);
    }, 200);
  } catch (error) {
    console.error(`[Media Stream] ❌ Error processing audio:`, error);
  }
}

/**
 * Flush any remaining audio in buffer to Gemini (called after silence)
 * Lower threshold: sends even very small chunks to ensure speech is captured
 */
function flushAudioBuffer(connection: MediaStreamConnection) {
  if (!connection.audioBuffer || connection.audioBuffer.length === 0) {
    return;
  }

  // Lower threshold: Send whatever is left in the buffer (even tiny chunks)
  // This ensures we capture all speech, even if it's quiet or short
  const remainingChunk = connection.audioBuffer;
  connection.audioBuffer = Buffer.alloc(0);

  // Only send if we have at least some audio
  if (remainingChunk.length === 0) {
    return;
  }

  // Convert and send
  const pcm16k = convertMulawToPCM16k(remainingChunk);

  // Skip if conversion failed or produced no data
  if (pcm16k.length === 0) {
    return;
  }

  const base64PCM = pcm16k.toString("base64");

  if (connection.geminiSession && connection.isGeminiConnected) {
    try {
      connection.geminiSession.sendRealtimeInput({
        audio: {
          data: base64PCM,
          mimeType: "audio/pcm;rate=16000",
        },
      });
      console.log(
        `[Gemini Live] ✅ Flushed remaining audio to Gemini (${remainingChunk.length} bytes μ-law → ${pcm16k.length} bytes PCM 16kHz)`
      );
    } catch (error) {
      console.error(`[Gemini Live] ❌ Error flushing audio to Gemini:`, error);
    }
  }
}

/**
 * Process and send audio to Twilio
 */
function processAndSendAudio(connection: MediaStreamConnection) {
  if (
    !connection.isStreamReady ||
    !connection.streamSid ||
    !connection.isGeminiConnected
  ) {
    return;
  }

  // Process PCM chunks from queue and convert to μ-law
  while (connection.audioQueueOutput.length > 0) {
    const audioChunk = connection.audioQueueOutput.shift()!;
    const mulawAudio = convertPCMToMulaw(audioChunk, 24000);
    connection.mulawBuffer = Buffer.concat([
      connection.mulawBuffer,
      mulawAudio,
    ]);
  }

  // Send exactly 160 bytes (20ms at 8kHz μ-law) per chunk
  while (connection.mulawBuffer.length >= 160) {
    const chunk160 = connection.mulawBuffer.slice(0, 160);
    connection.mulawBuffer = connection.mulawBuffer.slice(160);
    const base64Audio = chunk160.toString("base64");

    const mediaMessage = {
      event: "media",
      streamSid: connection.streamSid,
      media: {
        payload: base64Audio,
      },
      sequenceNumber: String(connection.sequenceNumber++),
    };

    try {
      connection.ws.send(JSON.stringify(mediaMessage));
      connection.lastAudioTimestamp = Date.now();

      if (!connection._chunkCount) connection._chunkCount = 0;
      connection._chunkCount++;
      if (connection._chunkCount <= 10 || Math.random() < 0.01) {
        console.log(`[Media Stream] ✅ Sent chunk #${connection._chunkCount}`);
      }
    } catch (error) {
      console.error(`[Media Stream] Error sending audio:`, error);
    }
  }
}

/**
 * Convert mu-law (8kHz) to PCM (16kHz)
 * Matches original working code exactly
 */
function convertMulawToPCM16k(mulawBuffer: Buffer): Buffer {
  if (!mulawBuffer || mulawBuffer.length === 0) {
    return Buffer.alloc(0);
  }

  try {
    // 1. Decode μ-law to PCM at 8kHz using proper library
    const mulawArray = new Uint8Array(mulawBuffer);
    const pcm8kSamples = mulaw.decode(mulawArray); // Returns Int16Array at 8kHz

    if (!pcm8kSamples || pcm8kSamples.length === 0) {
      console.error("[Audio Convert] mulaw.decode returned empty result");
      return Buffer.alloc(0);
    }

    // 2. Upsample from 8kHz to 16kHz by duplicating samples
    const numSamples8k = pcm8kSamples.length;
    const numSamples16k = numSamples8k * 2;
    const pcm16k = Buffer.alloc(numSamples16k * 2); // 16-bit = 2 bytes per sample

    for (let i = 0; i < numSamples8k; i++) {
      const sample = pcm8kSamples[i];
      // Write sample twice (duplicate) for upsampling
      pcm16k.writeInt16LE(sample, i * 4); // First copy
      pcm16k.writeInt16LE(sample, i * 4 + 2); // Second copy
    }

    return pcm16k;
  } catch (error) {
    console.error("[Audio Convert] Error in convertMulawToPCM16k:", error);
    return Buffer.alloc(0);
  }
}

/**
 * Convert PCM (24kHz) to μ-law (8kHz)
 */
function convertPCMToMulaw(pcmBuffer: Buffer, _sampleRate: number): Buffer {
  if (!pcmBuffer || pcmBuffer.length === 0) {
    return Buffer.alloc(0);
  }

  if (pcmBuffer.length % 2 !== 0) {
    pcmBuffer = Buffer.concat([pcmBuffer, Buffer.from([0])]);
  }

  // Downsample from 24kHz to 8kHz (take every 3rd sample)
  const pcm16 = new Int16Array(
    pcmBuffer.buffer,
    pcmBuffer.byteOffset,
    pcmBuffer.length / 2
  );
  const numSamples8k = Math.floor(pcm16.length / 3);
  const samples8k = new Int16Array(numSamples8k);

  for (let i = 0; i < numSamples8k; i++) {
    samples8k[i] = pcm16[i * 3]!;
  }

  // Convert to μ-law using proper library (ensures correct companding curve)
  const mulawData = mulaw.encode(samples8k);
  return Buffer.from(mulawData);
}

/**
 * Cleanup connection resources
 */
function cleanupConnection(
  connection: MediaStreamConnection,
  connectionTimeout: NodeJS.Timeout | null
) {
  if (connectionTimeout) {
    clearTimeout(connectionTimeout);
  }

  if (connection.playbackInterval) {
    clearInterval(connection.playbackInterval as NodeJS.Timeout);
    connection.playbackInterval = null;
  }

  if (connection.audioFlushTimeout) {
    clearTimeout(connection.audioFlushTimeout);
    connection.audioFlushTimeout = null;
  }

  if (connection.geminiSession) {
    try {
      connection.geminiSession.close();
    } catch (error) {
      console.error(`[Gemini Live] Error closing session:`, error);
    }
  }

  if (connection.callSid) {
    activeConnections.delete(connection.callSid);
  }

  // Also clean up by ws reference
  for (const [key, conn] of activeConnections.entries()) {
    if (conn.ws === connection.ws) {
      activeConnections.delete(key);
      break;
    }
  }
}

/**
 * Get active connection by callSid
 */
export function getActiveConnection(
  callSid: string
): MediaStreamConnection | undefined {
  return activeConnections.get(callSid);
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMediaStreamServer().catch(console.error);
}
