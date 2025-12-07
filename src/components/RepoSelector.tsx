import { useState, useEffect } from 'react';
import { Github, ChevronDown, X } from 'lucide-react';
import { getUserRepos } from '../services/apiService';

interface RepoSelectorProps {
  token: string;
  onSelectRepo: (repoUrl: string) => void;
}

interface Repo {
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
}

export default function RepoSelector({ token, onSelectRepo }: RepoSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && repos.length === 0 && !loading) {
      loadRepos();
    }
  }, [isOpen]);

  const loadRepos = async () => {
    setLoading(true);
    setError(null);
    try {
      const userRepos = await getUserRepos(token);
      setRepos(userRepos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRepo = (repo: Repo) => {
    onSelectRepo(repo.html_url);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium border border-gray-700 transition-colors"
      >
        <Github className="w-4 h-4" />
        My Repos
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute left-0 top-full mt-2 w-96 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Select Repository</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1">
              {loading && (
                <div className="p-8 text-center text-gray-400 text-sm">
                  Loading repositories...
                </div>
              )}

              {error && (
                <div className="p-4 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {!loading && !error && repos.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">
                  No repositories found
                </div>
              )}

              {!loading && !error && repos.length > 0 && (
                <div className="py-2">
                  {repos.map((repo) => (
                    <button
                      key={repo.full_name}
                      onClick={() => handleSelectRepo(repo)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors flex items-center gap-3"
                    >
                      <Github className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-white truncate">
                            {repo.name}
                          </span>
                          {repo.private && (
                            <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                              Private
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {repo.full_name}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

