import { useState } from 'react';
import { Shield, Code, ArrowRight, AlertTriangle } from 'lucide-react';
import RepoSelector from './RepoSelector';

interface HomeViewProps {
  onStartScan: (url: string) => void;
  isAuthenticated?: boolean;
  token?: string | null;
}

export default function HomeView({ onStartScan, isAuthenticated = false, token }: HomeViewProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!url.trim()) {
      return;
    }

    try {
      await onStartScan(url.trim());
    } catch (error) {
      console.error('Scan error:', error);
      // Error is handled in App.tsx
    }
  };

  const handleRepoSelect = (repoUrl: string) => {
    setUrl(repoUrl);
  };

  const handleDemoClick = async () => {
    const demoUrl = 'https://github.com/Dinogorgon/SpotifyTranscriber';
    setUrl(demoUrl);
    
    try {
      await onStartScan(demoUrl);
    } catch (error) {
      console.error('Demo scan error:', error);
      // Error is handled in App.tsx with alert
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden pt-16">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-vibegreen-500/10 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-3xl mx-auto text-center">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-900 border border-gray-700 text-xs font-medium text-gray-400 mb-6">
            <span className="w-2 h-2 rounded-full bg-vibegreen-500 animate-pulse"></span>
            Now scanning Bolt & Cursor projects
          </div>

          {/* Hero Section */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            Secure your<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-vibegreen-400 to-indigo-400">
              vibe coded
            </span>
            <br />apps.
          </h1>
          
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Automated penetration testing built for the AI generation. Find and fix SQL injections, exposed keys, and logic flaws in your AI-generated codebases in seconds.
          </p>

          {/* Input Form */}
          <div className="w-full max-w-4xl mx-auto mb-12">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              {isAuthenticated && token && (
                <div className="flex-shrink-0">
                  <RepoSelector token={token} onSelectRepo={handleRepoSelect} />
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex-1">
                <div className="flex flex-col md:flex-row gap-4 p-2 bg-gray-900/50 border border-gray-700 rounded-xl backdrop-blur-sm shadow-2xl items-center">
                  <div className="flex-1 flex items-center px-4 w-full min-w-0">
                    <Code className="w-5 h-5 text-gray-500 mr-3 flex-shrink-0" />
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Paste your GitHub repo or Live URL..."
                      className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 text-sm min-w-0"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!url.trim()}
                    className="bg-vibegreen-600 hover:bg-vibegreen-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-vibegreen-900/20 whitespace-nowrap flex-shrink-0"
                  >
                    Start Scan{' '}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Or{' '}
              <button
                type="button"
                onClick={handleDemoClick}
                className="text-gray-300 hover:underline"
              >
                try a demo repo
              </button>
            </p>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full px-4 text-left">
          <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors">
            <div className="mb-4 bg-gray-800 w-fit p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-200 mb-2">OWASP Top 10</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Automatically scans for the most critical web application security risks.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors">
            <div className="mb-4 bg-gray-800 w-fit p-3 rounded-lg">
              <Code className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-200 mb-2">Stack Detection</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Instantly identifies Next.js, Supabase, Firebase, and React patterns.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors">
            <div className="mb-4 bg-gray-800 w-fit p-3 rounded-lg">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-200 mb-2">One-Click Fix</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Generates tailored code patches for your specific tech stack.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

