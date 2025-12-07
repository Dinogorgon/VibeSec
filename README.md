# VibeSec - Automated Penetration Testing Platform

A React application for automated penetration testing of vibe-coded (AI-generated) applications. Scan GitHub repositories or URLs for security vulnerabilities and get AI-powered fixes.

## Features

- 🔒 **OWASP Top 10 Scanning** - Comprehensive security vulnerability detection
- 🔍 **Stack Detection** - Automatically identifies tech stack
- ⚡ **One-Click AI Fixes** - Powered by Google Gemini API
- 🎨 **Cyberpunk UI** - Modern dark theme with glassmorphism effects
- 📊 **Visual Analytics** - Interactive charts and security scoring

## Tech Stack

- **React** 18+ with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **React Markdown** for rendering AI responses
- **Lucide React** for icons
- **Google Gemini API** for AI-powered fixes

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Dinogorgon/VibeSec.git
cd VibeSec
```

2. Install dependencies:
```bash
npm install
cd backend
npm install
```

3. Set up environment variables:
   - Frontend: See `.env.production.example` in root
   - Backend: See `backend/.env.production.example`

### Development

Run the development servers:

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173` and backend at `http://localhost:3000`

### Build

Build for production:
```bash
npm run build
cd backend
npm run build
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions on deploying to:
- **Netlify** (Frontend)
- **Zeabur** (Backend)
- **Supabase** (Database)
- **Upstash** (Redis)

## Usage

1. **Home View**: Enter a GitHub repository URL or website URL
2. **Scanner View**: Watch the automated scan process with real-time terminal output
3. **Results View**: Review security score, vulnerability breakdown, and detected tech stack
4. **Fix Modal**: Click "Fix with AI" on any vulnerability to get AI-generated code fixes

## Project Structure

```
├── src/                    # Frontend React application
│   ├── components/         # React components
│   ├── services/           # API and WebSocket services
│   └── types.ts            # TypeScript interfaces
├── backend/                # Backend Express.js API
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic and scanners
│   │   ├── config/         # Configuration files
│   │   └── migrations/     # Database migrations
│   └── migrations/         # SQL migration files
├── netlify.toml            # Netlify deployment config
├── zeabur.yaml             # Zeabur deployment config
└── DEPLOYMENT.md           # Deployment guide
```

## Design System

- **Primary Color**: Vibe Green (#10b981)
- **Background**: Deep Dark (#030712)
- **Style**: Cyberpunk/Hacker aesthetic with glassmorphism
- **Fonts**: Inter (sans-serif), JetBrains Mono (monospace)

## License

Apache-2.0
