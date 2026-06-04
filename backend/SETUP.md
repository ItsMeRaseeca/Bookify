# Backend Setup Guide

This guide will help you get the Bookify backend up and running.

## Prerequisites

- **Node.js 18+** or **Bun** (recommended: Node.js 20+)
- **PostgreSQL 17+** (or use Docker Compose)
- **npm** or **bun** package manager

## Quick Start

### Option 1: Using Docker Compose (Recommended for Development)

This is the easiest way to get started as it sets up PostgreSQL automatically.

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` file:**
   - The `DATABASE_URL` is already configured for Docker Compose
   - Fill in the required values (see [Environment Variables](#environment-variables) below)
   - For development, you can use placeholder values for optional services

4. **Start PostgreSQL with Docker Compose:**
   ```bash
   docker-compose up -d
   ```
   This will start PostgreSQL on port 5432.

5. **Install dependencies:**
   ```bash
   npm install
   # or
   bun install
   ```

6. **Run database migrations:**
   ```bash
   npm run prisma:migrate
   # or
   bun run prisma:migrate
   ```

7. **Generate Prisma Client:**
   ```bash
   npm run prisma:generate
   # or
   bun run prisma:generate
   ```

8. **Start the development server:**
   ```bash
   npm run dev
   # or
   bun run dev
   ```

   The server should start on `http://localhost:3000`

9. **Verify it's working:**
   ```bash
   curl http://localhost:3000/health
   ```
   You should see: `{"success":true,"status":"healthy",...}`

---

### Option 2: Using External PostgreSQL

If you already have PostgreSQL running or prefer to manage it yourself:

1. **Create a PostgreSQL database:**
   ```sql
   CREATE DATABASE odoo_reborn;
   -- or use your preferred database name
   ```

2. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` file:**
   - Update `DATABASE_URL` with your PostgreSQL connection string:
     ```
     DATABASE_URL="postgresql://username:password@localhost:5432/your_database_name?schema=public"
     ```
   - Fill in other required values

5. **Install dependencies:**
   ```bash
   npm install
   ```

6. **Run database migrations:**
   ```bash
   npm run prisma:migrate
   ```

7. **Generate Prisma Client:**
   ```bash
   npm run prisma:generate
   ```

8. **Start the development server:**
   ```bash
   npm run dev
   ```

---

## Environment Variables

### Required Variables

These must be set for the backend to start:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET` | Secret key for JWT tokens (min 32 chars) | `your-super-secret-key-here` |
| `SMTP_EMAIL` | Gmail address for sending emails | `your-email@gmail.com` |
| `SMTP_APP_PASSWORD` | Gmail app password | Get from [Google App Passwords](https://myaccount.google.com/apppasswords) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Sign up at [cloudinary.com](https://cloudinary.com) |
| `CLOUDINARY_API_KEY` | Cloudinary API key | |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | |

### IVR (Voice Booking) Variables

For Twilio voice-based appointment booking with Gemini Live API:

| Variable | Description | Example |
|----------|-------------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | Get from [console.twilio.com](https://console.twilio.com) |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number | `+1234567890` |
| `GEMINI_API_KEY` | Google Gemini API key | Get from [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| `MEDIA_STREAM_WS_URL` | WebSocket URL for Media Streams | `wss://your-ngrok.ngrok-free.app` |
| `MEDIA_STREAM_PORT` | Port for WebSocket server (default: 8080) | `8080` |
| `IVR_WEBHOOK_URL` | Base URL for Twilio webhooks | `https://your-ngrok.ngrok-free.app` |

### Optional Variables

These enable additional features:

| Variable | Description | When Needed |
|----------|-------------|-------------|
| `PHONEPE_*` | PhonePe payment gateway config | For online payments |
| `GROQ_API_KEY` | Groq API key for AI chatbot | For chatbot feature |
| `WHAPI_TOKEN` | WhatsApp API token | For WhatsApp notifications |
| `PORT` | Server port (default: 3000) | To change port |
| `FRONTEND_URL` | Frontend URL for CORS | Default: `http://localhost:5173` |

### Getting API Keys

1. **Gmail App Password:**
   - Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
   - Generate a new app password for "Mail"
   - Use this as `SMTP_APP_PASSWORD`

2. **Cloudinary:**
   - Sign up at [cloudinary.com](https://cloudinary.com)
   - Get your credentials from the dashboard

3. **Groq (for AI Chatbot):**
   - Sign up at [console.groq.com](https://console.groq.com)
   - Create an API key

4. **PhonePe (for Payments):**
   - Sign up at [phonepe.com](https://phonepe.com)
   - Get merchant credentials from the dashboard

5. **Twilio (for IVR Voice Booking):**
   - Sign up at [twilio.com](https://www.twilio.com)
   - Get Account SID and Auth Token from the dashboard
   - Buy a phone number with voice capabilities

6. **Google Gemini (for IVR AI):**
   - Go to [aistudio.google.com](https://aistudio.google.com/app/apikey)
   - Create an API key
   - The IVR uses Gemini Live API for real-time voice conversations

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run ivr:media-server` | Start IVR Media Stream WebSocket server |
| `npm run ivr:media-server:dev` | Start IVR Media Stream server with hot reload |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:push` | Push schema changes to database (dev only) |
| `npm run prisma:studio` | Open Prisma Studio (database GUI) |

---

## IVR (Voice Booking) Setup

The IVR system allows users to book appointments via phone call using Twilio and Google's Gemini Live API for real-time voice conversations.

### Architecture

1. **Main Backend** (`npm run dev`) - Handles HTTP webhooks from Twilio
2. **Media Stream Server** (`npm run ivr:media-server`) - WebSocket server for real-time audio streaming with Gemini

### Development Setup

1. **Get API Keys:**
   - **Twilio:** Sign up at [twilio.com](https://www.twilio.com) and get your Account SID, Auth Token, and buy a phone number
   - **Gemini:** Get API key from [aistudio.google.com](https://aistudio.google.com/app/apikey)

2. **Set up ngrok for local development:**
   ```bash
   # Install ngrok
   brew install ngrok  # or download from ngrok.com
   
   # Start two tunnels (one for HTTP, one for WebSocket)
   # Terminal 1 - Main API (port 3000)
   ngrok http 3000
   
   # Terminal 2 - Media Stream WebSocket (port 8080)
   ngrok http 8080
   ```

3. **Configure environment variables:**
   ```bash
   # In your .env file
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   GEMINI_API_KEY=AIzaSy...
   MEDIA_STREAM_WS_URL=wss://your-ws-ngrok-url.ngrok-free.app
   IVR_WEBHOOK_URL=https://your-http-ngrok-url.ngrok-free.app
   MEDIA_STREAM_PORT=8080
   ```

4. **Configure Twilio Webhook:**
   - Go to your Twilio phone number settings
   - Set "A Call Comes In" webhook to: `https://your-ngrok-url.ngrok-free.app/api/ivr/incoming-call`
   - Method: POST

5. **Start the servers:**
   ```bash
   # Terminal 1 - Main backend
   npm run dev
   
   # Terminal 2 - IVR Media Stream server
   npm run ivr:media-server:dev
   ```

6. **Test by calling your Twilio phone number!**

### Docker Setup for IVR

```bash
# Build and start all services including IVR
docker-compose up -d

# Or build specific service
docker-compose build ivr-media-server
docker-compose up -d ivr-media-server
```

### How it Works

1. User calls your Twilio phone number
2. Twilio sends webhook to `/api/ivr/incoming-call`
3. Backend responds with TwiML to connect Media Stream
4. Twilio establishes WebSocket connection to Media Stream server
5. Audio is streamed in real-time between caller ↔ Gemini Live API
6. Gemini understands speech and responds with voice
7. When booking is confirmed, it's saved to the database
8. User receives confirmation via SMS/WhatsApp/Email

---

## Troubleshooting

### Database Connection Issues

- **Error: "Can't reach database server"**
  - Make sure PostgreSQL is running
  - Check `DATABASE_URL` in `.env` is correct
  - If using Docker, verify container is running: `docker ps`

- **Error: "Database does not exist"**
  - Create the database first: `CREATE DATABASE odoo_reborn;`
  - Or update `DATABASE_URL` to point to an existing database

### Migration Issues

- **Error: "Migration failed"**
  - Make sure database is empty or run: `npx prisma migrate reset` (⚠️ deletes all data)
  - Or manually fix the migration conflicts

### Port Already in Use

- **Error: "Port 3000 already in use"**
  - Change `PORT` in `.env` to a different port (e.g., `3001`)
  - Or stop the process using port 3000

### Environment Variable Validation

- The backend validates all required environment variables on startup
- If you see validation errors, check that all required variables are set in `.env`
- Make sure `.env` is in the `backend/` directory (not the root)

---

## Next Steps

Once the backend is running:

1. **Test the health endpoint:**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Open Prisma Studio** (optional, for database management):
   ```bash
   npm run prisma:studio
   ```
   This opens a GUI at `http://localhost:5555`

3. **Start the frontend** (see `../frontend/README.md`)

4. **Create your first user** via the signup endpoint or frontend

---

## Production Deployment

For production:

1. Set `NODE_ENV=production` in `.env`
2. Use a strong `JWT_SECRET` (generate with: `openssl rand -base64 32`)
3. Use a production PostgreSQL database
4. Set up proper CORS origins in `src/config/index.ts`
5. Build the project: `npm run build`
6. Start with: `npm start`

---

## Need Help?

- Check the logs for error messages
- Verify all environment variables are set correctly
- Make sure PostgreSQL is running and accessible
- Ensure all dependencies are installed: `npm install`

