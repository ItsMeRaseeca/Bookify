# Bookify

Bookify is a modern booking platform with a React/Vite frontend and a Node.js/Express/Prisma backend.

## Folders
- `frontend/` — React, Vite, TypeScript, Tailwind CSS
- `backend/` — Node.js, Express, Prisma, PostgreSQL

## Quick Start

### Frontend
```sh
cd frontend
npm install
npm run dev
```

### Backend
```sh
cd backend
npm install
npx prisma migrate deploy
npm run dev
```

### Backend with Docker Compose
You can run the backend and its dependencies (like PostgreSQL) using Docker Compose:

```sh
cd backend
docker-compose up --build
```

- Make sure your `.env` file is configured for Docker (see `backend/docker-compose.yml` for environment variables).

## Environment Variables
- Place secrets in `.env` files in each folder. **Do not commit `.env` or secrets to git.**

## License
MIT
