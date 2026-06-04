# Bookify Backend

This is the backend API for Bookify, built with Node.js, Express, and Prisma ORM.

## Features
- RESTful API for Bookify platform
- User authentication and OTP
- Admin, Organizer, and User roles
- Analytics and reporting endpoints
- PostgreSQL database (Prisma ORM)

## Getting Started

1. Install dependencies:
   ```sh
   npm install
   ```
2. Set up your environment variables in a `.env` file (not committed to git)
3. Run database migrations:
   ```sh
   npx prisma migrate deploy
   ```
4. Start the development server:
   ```sh
   npm run dev
   ```

## Running with Docker Compose

You can run the backend and its dependencies (like PostgreSQL) using Docker Compose:

```sh
# From the backend directory
 docker-compose up --build
```

- Make sure your `.env` file is configured for Docker (see `docker-compose.yml` for environment variables).

## Project Structure
- `src/` - Main source code
- `prisma/` - Prisma schema and migrations

## Environment Variables
- Place environment variables in a `.env` file (not committed to git)
- **Do not commit `.env` or any secrets to git.**

## License
MIT
