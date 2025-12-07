# VibeSec Backend

Backend API server for the VibeSec security scanning platform.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+ (for BullMQ job queue)
- GitHub OAuth App (for authentication)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- `DATABASE_URL`: PostgreSQL connection string
- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`: From your GitHub OAuth app
- `JWT_SECRET`: Random secret for JWT tokens
- `REDIS_URL`: Redis connection string
- `FRONTEND_URL`: Your frontend URL (for CORS)

3. Run database migrations:
```bash
npm run migrate
```

4. Start the development server:
```bash
npm run dev
```

The server will run on `http://localhost:3000` by default.

## GitHub OAuth Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App
3. Set Authorization callback URL to: `http://localhost:3000/api/auth/github/callback`
4. Copy Client ID and Client Secret to `.env`

## API Endpoints

### Authentication
- `GET /api/auth/github` - Initiate GitHub OAuth
- `GET /api/auth/github/callback` - OAuth callback
- `GET /api/auth/me` - Get current user (requires auth)
- `POST /api/auth/logout` - Logout

### Scans
- `POST /api/scan` - Start new scan (requires auth)
- `GET /api/scan/:id` - Get scan results (requires auth)
- `GET /api/scan/:id/status` - Get scan status (requires auth)
- `GET /api/scans` - List user's scans (requires auth)

### WebSocket
- `ws://localhost:3000/ws/scan?scanId=<scan-id>` - Real-time scan updates

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   ├── websocket/       # WebSocket server
│   └── server.ts        # Entry point
├── migrations/          # Database migrations
└── package.json
```

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run migrate` - Run database migrations

