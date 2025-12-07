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
git clone <repository-url>
cd vibesec
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Add your Google Gemini API key to `.env`:
```
VITE_GEMINI_API_KEY=your_api_key_here
```

Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey).

### Development

Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Usage

1. **Home View**: Enter a GitHub repository URL or website URL
2. **Scanner View**: Watch the automated scan process with real-time terminal output
3. **Results View**: Review security score, vulnerability breakdown, and detected tech stack
4. **Fix Modal**: Click "Fix with AI" on any vulnerability to get AI-generated code fixes

## Project Structure

```
src/
├── components/          # React components
│   ├── HomeView.tsx    # Landing page
│   ├── ScannerView.tsx # Scanning animation
│   ├── ResultsView.tsx # Dashboard with results
│   ├── VulnerabilityList.tsx
│   └── FixModal.tsx   # AI fix generator modal
├── data/
│   └── mockData.ts    # Mock vulnerability data
├── services/
│   └── geminiService.ts # Gemini API integration
├── types.ts            # TypeScript interfaces
├── App.tsx             # Main app component
└── main.tsx            # Entry point
```

## Design System

- **Primary Color**: Vibe Green (#10b981)
- **Background**: Deep Dark (#030712)
- **Style**: Cyberpunk/Hacker aesthetic with glassmorphism
- **Fonts**: Inter (sans-serif), JetBrains Mono (monospace)

## License

MIT

