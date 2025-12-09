import { useState, useEffect, useRef } from 'react';
import { Shield, Github, LogOut } from 'lucide-react';
import ProfilePanel from './ProfilePanel';
import { User } from '../types';
import { getApiUrl } from '../utils/apiUrl';

interface HeaderProps {
  onLogoClick?: () => void;
  user?: User | null;
  onLogout?: () => void;
  onSettingsClick?: () => void;
  onDocsClick?: () => void;
  onPricingClick?: () => void;
  currentView?: string;
}

export default function Header({ onLogoClick, user, onLogout, onSettingsClick, onDocsClick, onPricingClick, currentView }: HeaderProps) {
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const handleLogin = () => {
    window.location.replace(getApiUrl('/api/auth/github'));
  };

  // Close profile panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfilePanel(false);
      }
    };

    if (showProfilePanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfilePanel]);

  return (
    <nav className="border-b border-gray-800 bg-[#030712] fixed w-full z-50 top-0">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={onLogoClick}
        >
          <div className="bg-vibegreen-500/20 p-2 rounded-lg">
            <Shield className="w-6 h-6 text-vibegreen-500" />
          </div>
          <span className="font-bold text-xl tracking-tight">
            Vibesec<span className="text-vibegreen-500">.</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onDocsClick}
            className={`transition-colors text-sm ${
              currentView === 'docs' 
                ? 'text-vibegreen-400 font-semibold' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Docs
          </button>
          <button 
            onClick={onPricingClick}
            className={`transition-colors text-sm ${
              currentView === 'pricing' 
                ? 'text-vibegreen-400 font-semibold' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Pricing
          </button>
          {user ? (
            <div className="flex items-center gap-3">
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setShowProfilePanel(!showProfilePanel)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.githubUsername}
                      className="w-8 h-8 rounded-full border border-gray-700 cursor-pointer"
                      onError={(e) => {
                        // Fallback to default avatar if image fails to load
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.githubUsername)}&background=10b981&color=fff&size=32`;
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-vibegreen-500 flex items-center justify-center text-white text-xs font-bold cursor-pointer">
                      {user.githubUsername.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
                {showProfilePanel && onSettingsClick && (
                  <ProfilePanel
                    user={user}
                    onSettingsClick={onSettingsClick}
                    onClose={() => setShowProfilePanel(false)}
                  />
                )}
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium border border-gray-700 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium border border-gray-700 transition-colors"
            >
              <Github className="w-4 h-4" />
              Login with GitHub
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

