import { X, AlertTriangle, Github } from 'lucide-react';

interface RepositoryAccessErrorModalProps {
  onClose: () => void;
  repositoryUrl: string;
}

export default function RepositoryAccessErrorModal({ onClose, repositoryUrl }: RepositoryAccessErrorModalProps) {
  // Extract repo name from URL
  const repoMatch = repositoryUrl.match(/github\.com[/:]([^\/]+)\/([^\/]+?)(?:\.git)?\/?$/);
  const repoName = repoMatch ? `${repoMatch[1]}/${repoMatch[2]}` : repositoryUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-effect rounded-lg max-w-md w-full border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-semibold">Repository Access Required</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-300 mb-4">
            You don't have write access to <span className="font-mono text-vibegreen-400">{repoName}</span>.
          </p>
          
          <div className="bg-gray-800/50 rounded-lg p-4 mb-4 border border-gray-700">
            <p className="text-sm text-gray-400 mb-2">
              To use "Fix with AI", you need to:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
              <li>Be the owner of the repository, or</li>
              <li>Have write/admin access as a collaborator</li>
            </ul>
          </div>

          <p className="text-sm text-gray-400">
            You can still view all detected vulnerabilities, but AI-generated fixes can only be applied to repositories you have edit access to.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              window.open(`https://github.com/${repoName}`, '_blank');
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Github className="w-4 h-4" />
            View Repository
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-vibegreen-500 hover:bg-vibegreen-600 rounded-lg transition-colors font-semibold"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}

