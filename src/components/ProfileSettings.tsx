import { useState, useEffect } from 'react';
import { ArrowLeft, Key, Trash2, Loader2, Check, X, Cpu } from 'lucide-react';
import { User } from '../types';
import { saveGeminiApiKey, deleteGeminiApiKey, updateGeminiModel } from '../services/apiService';

interface ProfileSettingsProps {
  user: User;
  token: string;
  onBack: () => void;
  onUserUpdate: (updatedUser: User) => void;
}

const GEMINI_MODELS = [
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
];

export default function ProfileSettings({ user, token, onBack, onUserUpdate }: ProfileSettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState(user.geminiModel || 'gemini-2.5-flash-lite');
  const [loading, setLoading] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Update selected model when user changes
  useEffect(() => {
    setSelectedModel(user.geminiModel || 'gemini-2.5-flash-lite');
  }, [user.geminiModel]);

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await saveGeminiApiKey(token, apiKey.trim());
      setSuccess('API key saved successfully');
      setApiKey('');
      onUserUpdate({ ...user, hasGeminiKey: true });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApiKey = async () => {
    setDeleteLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await deleteGeminiApiKey(token);
      setSuccess('API key deleted successfully');
      setShowDeleteConfirm(false);
      onUserUpdate({ ...user, hasGeminiKey: false });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key');
      setShowDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleModelChange = async (model: string) => {
    setSelectedModel(model);
    setModelLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await updateGeminiModel(token, model);
      setSuccess(`Model updated to ${GEMINI_MODELS.find(m => m.value === model)?.label || model}`);
      onUserUpdate({ ...user, geminiModel: model });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update model');
      // Revert selection on error
      setSelectedModel(user.geminiModel || 'gemini-2.5-flash-lite');
    } finally {
      setModelLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white pt-16">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
          <p className="text-gray-400">Manage your account and API keys</p>
        </div>

        {/* User Info Card */}
        <div className="glass-effect rounded-lg p-6 mb-6 border border-gray-800">
          <div className="flex items-center gap-4">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={`${user.githubUsername}'s avatar`}
                className="w-16 h-16 rounded-full border border-gray-700"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-2xl font-medium">{user.githubUsername.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold">{user.githubUsername}</h2>
              <p className="text-gray-400 text-sm">GitHub Account</p>
            </div>
          </div>
        </div>

        {/* Model Selection */}
        <div className="glass-effect rounded-lg p-6 border border-gray-800 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-vibegreen-500" />
            <h2 className="text-xl font-semibold">Gemini Model</h2>
          </div>

          <div className="mb-4">
            <label htmlFor="geminiModel" className="block text-sm font-medium mb-2">
              Select Model
            </label>
            <select
              id="geminiModel"
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={modelLoading || !user.hasGeminiKey}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-vibegreen-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {GEMINI_MODELS.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              {!user.hasGeminiKey 
                ? 'Add an API key first to select a model'
                : 'Choose which Gemini model to use for AI-generated fixes'}
            </p>
            {user.hasGeminiKey && (
              <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-blue-400">
                  <strong>Note:</strong> If your preferred model is not available, the system will automatically try alternative models (Gemini 2.5 Flash Lite → Gemini 2.5 Flash → Gemini 2.5 Pro → Gemini 2.0 Flash) until one successfully generates a response.
                </p>
              </div>
            )}
            {modelLoading && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating model...
              </div>
            )}
          </div>
        </div>

        {/* API Key Management */}
        <div className="glass-effect rounded-lg p-6 border border-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-vibegreen-500" />
            <h2 className="text-xl font-semibold">Gemini API Key</h2>
          </div>

          {/* Status */}
          <div className="mb-6">
            <p className="text-sm text-gray-400 mb-2">Current Status:</p>
            <div className="flex items-center gap-2">
              {user.hasGeminiKey ? (
                <>
                  <Check className="w-4 h-4 text-vibegreen-500" />
                  <span className="text-vibegreen-400">API Key: Configured</span>
                </>
              ) : (
                <>
                  <X className="w-4 h-4 text-red-500" />
                  <span className="text-red-400">API Key: Not configured</span>
                </>
              )}
            </div>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-4 p-3 bg-vibegreen-500/20 border border-vibegreen-500/30 rounded-lg">
              <p className="text-vibegreen-400 text-sm">{success}</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Update API Key Form */}
          <form onSubmit={handleSaveApiKey} className="mb-6">
            <label htmlFor="apiKey" className="block text-sm font-medium mb-2">
              {user.hasGeminiKey ? 'Update API Key' : 'Add API Key'}
            </label>
            <div className="flex gap-3">
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setError(null);
                }}
                placeholder="Enter your Gemini API key"
                className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-vibegreen-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !apiKey.trim()}
                className="px-6 py-2 bg-vibegreen-500 hover:bg-vibegreen-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  user.hasGeminiKey ? 'Update' : 'Save'
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Get your free API key from{' '}
              <a
                href="https://makersuite.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-vibegreen-500 hover:underline"
              >
                Google AI Studio
              </a>
            </p>
          </form>

          {/* Delete API Key */}
          {user.hasGeminiKey && (
            <div className="pt-6 border-t border-gray-800">
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete API Key
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-400">
                    Are you sure you want to delete your API key? You'll need to add it again to use AI fixes.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDeleteApiKey}
                      disabled={deleteLoading}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center gap-2"
                    >
                      {deleteLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Confirm Delete
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setError(null);
                      }}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                      disabled={deleteLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

