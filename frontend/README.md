# Bookify - Service Booking Platform

A modern service booking platform built with React, Vite, and TypeScript.

## Features

- 🎯 **Service Discovery** - Browse and search services
- 📅 **Slot Booking** - Book available time slots
- 💬 **AI Chat Assistant** - Get help booking via chat
- 🎙️ **Voice Assistant** - Book services using voice
- 💳 **Payment Integration** - Online & cash payments
- 📧 **Notifications** - Email & WhatsApp confirmations
- 📱 **Responsive Design** - Works on all devices

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express 5, Prisma, PostgreSQL
- **AI**: OpenAI Agents SDK, Groq, Google Gemini Live API

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   cd frontend && npm install
   cd backend && npm install
   ```

3. Set up environment variables (see `.env.example`)

4. Run database migrations:
   ```bash
   cd backend && npx prisma migrate dev
   ```

5. Start the development servers:
   ```bash
   # Frontend (port 8080)
   cd frontend && npm run dev
   
   # Backend (port 3000)
   cd backend && npm run dev
   ```

## Project Structure
- `src/` - Main source code
- `public/` - Static assets
- `components/` - Reusable UI components
- `pages/` - Application pages

## Environment Variables
- Place environment variables in a `.env` file (not committed to git)
- **Do not commit `.env` or any secrets to git.**

## License

MIT
