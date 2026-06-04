# 📚 Bookify

**Bookify** is a modern, full-stack service booking platform designed to streamline service discovery, scheduling, and management. It features a powerful AI Chat Assistant and Voice Assistant to help users book services effortlessly.

---

## ✨ Key Features

- 🎯 **Service Discovery**: Browse, search, and filter available services.
- 📅 **Slot Booking**: Seamlessly book and manage available time slots.
- 💬 **AI Chat Assistant**: Get intelligent help with booking through conversational AI.
- 🎙️ **Voice Assistant**: Book services hands-free using voice commands.
- 💳 **Payment Integration**: Support for online transactions and cash payments.
- 📧 **Automated Notifications**: Email and WhatsApp booking confirmations.
- 👥 **Role-Based Access**: Specialized dashboards for Admins, Organizers, and Users.
- 📊 **Analytics & Reporting**: Track platform usage and business metrics.
- 📱 **Responsive Design**: Beautiful, responsive UI that works perfectly on all devices.

## 🛠️ Tech Stack

Bookify is built using modern web technologies:

### Frontend
- **Framework**: React 18 with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Radix UI primitives
- **Animations**: Framer Motion
- **Data Visualization**: Recharts
- **State/Data Fetching**: React Query & Axios

### Backend
- **Runtime**: Node.js
- **Framework**: Express 5
- **ORM**: Prisma
- **Database**: PostgreSQL
- **AI Integrations**: OpenAI Agents SDK, Groq, Google Gemini API
- **Utilities**: JWT (Auth), Bcrypt (Hashing), Nodemailer & Twilio (Notifications), PDFKit

## 📂 Project Structure

This is a monorepo-style project organized into two main directories:

- `/frontend` - The React Vite frontend application.
- `/backend` - The Node.js Express backend API and database schemas.

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher) or [Bun](https://bun.sh/)
- [PostgreSQL](https://www.postgresql.org/) database
- API Keys for AI, Email, and Twilio services (for full functionality)

### Installation & Setup

1. **Navigate to the project** (if you haven't already):
   ```bash
   cd Bookify
   ```

2. **Install Dependencies**:
   ```bash
   # Install frontend dependencies
   cd frontend
   npm install

   # Install backend dependencies
   cd ../backend
   npm install
   ```

3. **Environment Variables**:
   - Create a `.env` file in the `backend/` directory based on the provided examples.
   - Create a `.env` file in the `frontend/` directory if required.
   - *Note: Never commit your `.env` files to version control.*

4. **Database Setup**:
   Ensure your PostgreSQL instance is running and your `DATABASE_URL` is set in the backend `.env`.
   ```bash
   cd backend
   npx prisma migrate dev
   ```

### Running the Application

You need to run both the frontend and backend development servers concurrently.

**Start the Backend** (Default port: 3000):
```bash
cd backend
npm run dev
```

**Start the Frontend**:
```bash
cd frontend
npm run dev
```

### 🐳 Running with Docker

Bookify's backend can be easily spun up using Docker Compose, which will also set up the PostgreSQL database automatically.

```bash
cd backend
docker-compose up --build
```
*Make sure your `.env` variables are correctly configured for the Docker environment (refer to `docker-compose.yml`).*

## 📜 License

This project is licensed under the MIT License.
