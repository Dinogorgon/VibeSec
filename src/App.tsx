import { useState, useEffect, useCallback } from 'react';
import { View, User } from './types';
import Header from './components/Header';
import HomeView from './components/HomeView';
import ScannerView from './components/ScannerView';
import ResultsView from './components/ResultsView';
import DocsView from './components/DocsView';
import PricingView from './components/PricingView';
import ApiKeyModal from './components/ApiKeyModal';
import ProfileSettings from './components/ProfileSettings';
import { getCurrentUser, saveGeminiApiKey } from './services/apiService';
import { getApiUrl } from './utils/apiUrl';
import './App.css';

function App() {
  const [view, setView] = useState<View>('home');
  const [scanUrl, setScanUrl] = useState<string>('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanId, setScanId] = useState<string>('');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [apiKeyModalIsLoginPrompt, setApiKeyModalIsLoginPrompt] = useState(false);
  const [previousView, setPreviousView] = useState<View>('home');

  // Check for token in URL (from OAuth callback) or localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    const urlError = urlParams.get('error');
    
    // Handle OAuth errors
    if (urlError) {
      let errorMessage = 'Authentication failed';
      switch (urlError) {
        case 'access_denied':
          errorMessage = 'GitHub authentication was cancelled';
          break;
        case 'oauth_failed':
          errorMessage = 'OAuth authentication failed. Please try again.';
          break;
        case 'missing_code':
          errorMessage = 'Authentication code missing. Please try again.';
          break;
        default:
          errorMessage = `Authentication error: ${urlError}`;
      }
      alert(errorMessage);
      // Clean error from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    
    if (urlToken) {
      localStorage.setItem('vibesec_token', urlToken);
      setToken(urlToken);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const storedToken = localStorage.getItem('vibesec_token');
      if (storedToken) {
        setToken(storedToken);
      }
    }
  }, []);

  // Fetch user info when token is available
  useEffect(() => {
    if (token) {
      getCurrentUser(token).then(setUser).catch(() => {
        // Token invalid, clear it
        localStorage.removeItem('vibesec_token');
        setToken(null);
      });
    }
  }, [token]);

  const handleStartScan = useCallback(async (url: string): Promise<void> => {
    if (!token) {
      // Store URL to scan after login
      sessionStorage.setItem('pending_scan_url', url);
      // Redirect to GitHub OAuth if not authenticated
      window.location.replace(getApiUrl('/api/auth/github'));
      return;
    }

    try {
      const { startScan } = await import('./services/apiService');
      const result = await startScan(url, token);
      setScanUrl(url);
      setScanId(result.scanId);
      setView('scanning');
    } catch (error) {
      console.error('Failed to start scan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start scan';
      alert(errorMessage);
      throw error; // Re-throw so caller knows it failed
    }
  }, [token]);

  // Check for pending scan URL after login
  useEffect(() => {
    if (token) {
      const pendingUrl = sessionStorage.getItem('pending_scan_url');
      if (pendingUrl) {
        sessionStorage.removeItem('pending_scan_url');
        // Small delay to ensure user state is loaded
        setTimeout(() => {
          handleStartScan(pendingUrl).catch((error) => {
            console.error('Failed to start pending scan:', error);
          });
        }, 500);
      }
    }
  }, [token, handleStartScan]);

  const handleScanComplete = (result: any) => {
    setScanResult(result);
    setView('results');
  };

  const handleReset = () => {
    setView('home');
    setScanUrl('');
    setScanResult(null);
    setScanId('');
    setShowProfileSettings(false); // Close settings if open
    setPreviousView('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('vibesec_token');
    setToken(null);
    setUser(null);
    handleReset();
  };

  const handleApiKeyRequired = (isLogin: boolean = false) => {
    setApiKeyModalIsLoginPrompt(isLogin);
    setShowApiKeyModal(true);
  };

  const handleApiKeySave = async (apiKey: string) => {
    if (!token) {
      throw new Error('Not authenticated');
    }
    await saveGeminiApiKey(token, apiKey);
    // Refresh user data to get updated hasGeminiKey status
    if (token) {
      const updatedUser = await getCurrentUser(token);
      if (updatedUser) {
        setUser(updatedUser);
      }
    }
  };

  const handleOpenSettings = () => {
    // Save current view before opening settings
    setPreviousView(view);
    setShowProfileSettings(true);
  };

  const handleCloseSettings = () => {
    setShowProfileSettings(false);
    // Restore previous view
    setView(previousView);
    // Refresh user data when closing settings
    if (token) {
      getCurrentUser(token).then(setUser).catch(() => {
        localStorage.removeItem('vibesec_token');
        setToken(null);
        setUser(null);
      });
    }
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <Header 
        onLogoClick={handleReset} 
        user={user} 
        onLogout={handleLogout}
        onSettingsClick={handleOpenSettings}
        onDocsClick={() => setView('docs')}
        onPricingClick={() => setView('pricing')}
        currentView={view}
      />
      <div className="pt-16">
        {showProfileSettings && user && token ? (
          <ProfileSettings
            user={user}
            token={token}
            onBack={handleCloseSettings}
            onUserUpdate={handleUserUpdate}
          />
        ) : (
          <>
            {view === 'home' && <HomeView onStartScan={handleStartScan} isAuthenticated={!!token} token={token} />}
            {view === 'scanning' && token && scanId && (
              <ScannerView url={scanUrl} scanId={scanId} token={token} onComplete={handleScanComplete} />
            )}
            {view === 'results' && (
              <ResultsView 
                result={scanResult} 
                onReset={handleReset}
                user={user}
                token={token}
                onApiKeyRequired={handleApiKeyRequired}
              />
            )}
            {view === 'docs' && <DocsView onBack={() => setView('home')} />}
            {view === 'pricing' && <PricingView onBack={() => setView('home')} />}
          </>
        )}
      </div>
      {showApiKeyModal && (
        <ApiKeyModal
          onClose={() => setShowApiKeyModal(false)}
          onSave={handleApiKeySave}
          isLoginPrompt={apiKeyModalIsLoginPrompt}
        />
      )}
    </div>
  );
}

export default App;

