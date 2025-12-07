# Backend Setup Guide

## Quick Start

1. **Create `.env` file:**
   ```bash
   # On Windows PowerShell:
   Copy-Item .env.example .env
   
   # On Linux/Mac:
   cp .env.example .env
   ```

2. **Edit `.env` file** with your actual values:
   - `DATABASE_URL`: PostgreSQL connection string
   - `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`: From GitHub OAuth app
   - `JWT_SECRET`: Any random secret string
   - `REDIS_URL`: Redis connection (default: redis://localhost:6379)

3. **Start PostgreSQL:**
   - Make sure PostgreSQL is installed and running
   - Create a database named `vibesec`:
     ```sql
     CREATE DATABASE vibesec;
     ```

4. **Start Redis:**
   - Make sure Redis is installed and running
   - Default port: 6379

5. **Run migrations:**
   ```bash
   npm run migrate
   ```

6. **Start the server:**
   ```bash
   npm run dev
   ```

## Environment Variables

### Required Variables

- `DATABASE_URL`: PostgreSQL connection string
  - Format: `postgresql://username:password@localhost:5432/vibesec`
  - Example: `postgresql://postgres:mypassword@localhost:5432/vibesec`

- `GITHUB_CLIENT_ID`: Your GitHub OAuth App Client ID
- `GITHUB_CLIENT_SECRET`: Your GitHub OAuth App Client Secret
- `JWT_SECRET`: Secret key for JWT tokens (use a random string)

### Optional Variables (with defaults)

- `GITHUB_CALLBACK_URL`: Defaults to `http://localhost:3000/api/auth/github/callback`
- `REDIS_URL`: Defaults to `redis://localhost:6379`
- `PORT`: Defaults to `3000`
- `NODE_ENV`: Defaults to `development`
- `FRONTEND_URL`: Defaults to `http://localhost:5173`

## GitHub OAuth Setup

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: VibeSec
   - **Homepage URL**: http://localhost:5173
   - **Authorization callback URL**: http://localhost:3000/api/auth/github/callback
4. Click "Register application"
5. Copy the **Client ID** and **Client Secret** to your `.env` file

## Troubleshooting

### "Missing required environment variable"
- Make sure `.env` file exists in the `backend` directory
- Check that all required variables are set

### "ECONNREFUSED" when running migrations
- PostgreSQL is not running or connection string is incorrect
- Check PostgreSQL is installed and running
- Verify DATABASE_URL format is correct

### "Redis connection failed"
- Redis is not running
- Check Redis is installed and running on port 6379

