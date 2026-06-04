# IVR (Interactive Voice Response) System

This module provides voice-based appointment booking using **Twilio Media Streams** and **Google Gemini Live API** for real-time AI-powered voice conversations.

## Architecture Overview

```
┌──────────────────┐     ┌─────────────────────┐     ┌───────────────────┐
│   User Phone     │────▶│   Twilio Cloud      │────▶│   Your Backend    │
│                  │◀────│                     │◀────│                   │
└──────────────────┘     └─────────────────────┘     └───────────────────┘
                                   │                          │
                                   │ WebSocket                │
                                   ▼                          ▼
                         ┌─────────────────────┐     ┌───────────────────┐
                         │ Media Stream Server │◀───▶│  Gemini Live API  │
                         │    (Port 8080)      │     │                   │
                         └─────────────────────┘     └───────────────────┘
```

### Components

1. **Main Backend** (Port 3000)
   - Handles Twilio HTTP webhooks
   - Routes: `/api/ivr/incoming-call`, `/api/ivr/gather`, `/api/ivr/status`
   - Fallback to Gather mode if Media Streams unavailable

2. **Media Stream Server** (Port 8080)
   - WebSocket server for real-time audio
   - Bidirectional audio streaming with Twilio
   - Connects to Gemini Live API for AI conversations

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Add these to your `.env` file:

```env
# ===== TWILIO CONFIGURATION =====
# Get from https://console.twilio.com/
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# ===== GEMINI API =====
# Get from https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIzaSy...your_api_key

# ===== IVR CONFIGURATION =====
# These URLs point to your publicly accessible server
# Use ngrok for local development
MEDIA_STREAM_WS_URL=wss://your-domain.ngrok-free.app
MEDIA_STREAM_PORT=8080
IVR_WEBHOOK_URL=https://your-domain.ngrok-free.app
```

### 3. Set Up ngrok (Development Only)

For local development, you need to expose your local servers to the internet:

```bash
# Install ngrok if not installed
brew install ngrok  # macOS
# or download from https://ngrok.com/download

# Start ngrok for the main backend (port 3000)
ngrok http 3000

# In another terminal, start ngrok for WebSocket server (port 8080)
ngrok http 8080
```

Copy the ngrok URLs and update your `.env`:
- HTTP URL (e.g., `https://abc123.ngrok-free.app`) → `IVR_WEBHOOK_URL`
- WebSocket URL (e.g., `wss://xyz789.ngrok-free.app`) → `MEDIA_STREAM_WS_URL`

### 4. Start the Servers

**Terminal 1 - Main Backend:**
```bash
npm run dev
```

**Terminal 2 - Media Stream Server:**
```bash
npm run ivr:media-server:dev
```

### 5. Configure Twilio Phone Number

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Phone Numbers** → **Manage** → **Active Numbers**
3. Click on your phone number
4. Under **Voice Configuration**:
   - **A Call Comes In**: Webhook
   - **URL**: `https://your-ngrok-url.ngrok-free.app/api/ivr/incoming-call`
   - **HTTP Method**: POST
5. Optional: Set **Call Status Changes** URL to:
   - `https://your-ngrok-url.ngrok-free.app/api/ivr/status`

### 6. Test It!

Call your Twilio phone number. You should hear the AI assistant greeting you!

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run ivr:media-server` | Start the WebSocket media stream server |
| `npm run ivr:media-server:dev` | Start with hot reload (development) |

---

## API Endpoints

### POST /api/ivr/incoming-call

Twilio webhook for incoming calls. Returns TwiML to either:
- Connect to Media Stream (if `MEDIA_STREAM_WS_URL` is set)
- Use Gather mode (fallback)

### POST /api/ivr/gather

Handles speech recognition results in Gather mode. Processes user input and responds with TwiML.

### POST /api/ivr/status

Receives call status updates. Cleans up conversation state when calls end.

### GET /api/ivr/system-prompt

Returns the current AI system prompt (for debugging).

---

## How Booking Works

1. **User calls** → Twilio sends webhook to `/api/ivr/incoming-call`
2. **Media Stream connects** → Real-time audio bidirectional streaming
3. **Gemini AI listens** → Understands speech, extracts booking intent
4. **AI collects info**:
   - Service type (matched to database)
   - Date (today, tomorrow, specific date)
   - Time (from available slots)
   - Name (for booking)
5. **Confirmation** → AI asks "Should I confirm this booking?"
6. **Booking created** → Entry saved to database
7. **Notifications sent** → Email/SMS/WhatsApp confirmation

### Phone Number as Identifier

- Phone is captured automatically from Twilio caller ID
- If user exists (by phone), their profile is used
- If new user, a guest account is created automatically
- Name can be updated during the call

---

## Troubleshooting

### "GEMINI_API_KEY not configured"

Make sure your `.env` file has the Gemini API key:
```env
GEMINI_API_KEY=AIzaSy...
```

### "MEDIA_STREAM_WS_URL environment variable is not set"

Add the WebSocket URL to your `.env`:
```env
MEDIA_STREAM_WS_URL=wss://your-ngrok-domain.ngrok-free.app
```

### No audio from AI

1. Check Gemini Live API connection in logs
2. Verify audio encoding (μ-law 8kHz for Twilio)
3. Ensure WebSocket connection is established

### Call immediately hangs up

1. Check Twilio webhook URL is correct
2. Verify ngrok is running and accessible
3. Look at backend logs for TwiML errors

### "Connection timeout" in logs

1. Ensure Media Stream server is running on port 8080
2. Check ngrok WebSocket tunnel is active
3. Verify `MEDIA_STREAM_WS_URL` matches ngrok URL

---

## Production Deployment

### Docker

```bash
# Build and run all services
docker-compose up -d

# View logs
docker-compose logs -f ivr-media-server
```

### Environment Variables for Production

```env
NODE_ENV=production
MEDIA_STREAM_WS_URL=wss://your-production-domain.com
IVR_WEBHOOK_URL=https://your-production-domain.com
```

### Requirements

- WebSocket server must be accessible on port 8080 (or configure via `MEDIA_STREAM_PORT`)
- HTTPS required for Twilio webhooks
- WSS (secure WebSocket) required for Media Streams

---

## File Structure

```
backend/src/modules/ivr/
├── ivr.types.ts           # TypeScript types
├── twilio.utils.ts        # TwiML generation, Twilio helpers
├── ivr.service.ts         # Business logic, booking, database
├── ivr.controller.ts      # HTTP webhook handlers
├── ivr.routes.ts          # Express routes
├── media-stream-server.ts # WebSocket server for Gemini Live
└── README.md              # This file
```

---

## Dependencies

- `twilio` - Twilio SDK
- `ws` - WebSocket server
- `@google/genai` - Gemini Live API
- `alawmulaw` - Audio encoding/decoding (μ-law)
- `date-fns` - Date utilities

