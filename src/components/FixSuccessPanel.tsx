import { CheckCircle, ExternalLink, GitBranch, GitPullRequest, AlertCircle } from 'lucide-react';

interface FixSuccessPanelProps {
  prUrl: string;
  prNumber: number;
  branchName: string;
  branchUrl: string;
  onClose: () => void;
}

export default function FixSuccessPanel({
  prUrl,
  prNumber,
  branchName,
  branchUrl,
  onClose,
}: FixSuccessPanelProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-lg w-full shadow-2xl">
        {/* Success Icon */}
        <div className="flex items-center justify-center mb-4">
          <div className="bg-vibegreen-500/20 p-3 rounded-full">
            <CheckCircle className="w-8 h-8 text-vibegreen-500" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-2">Fix Applied Successfully!</h2>
        
        {/* Description */}
        <p className="text-gray-400 text-center mb-6">
          A pull request has been created with the security fix. Review and merge it on GitHub to apply the changes.
        </p>

        {/* Important Notice */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-semibold text-sm mb-1">Action Required</p>
              <p className="text-yellow-300/80 text-sm">
                You must go to your GitHub repository to review and accept the pull request before the changes will take effect.
              </p>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="space-y-3 mb-6">
          <a
            href={prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <GitPullRequest className="w-5 h-5 text-vibegreen-500" />
              <div>
                <p className="font-semibold text-white">Pull Request #{prNumber}</p>
                <p className="text-sm text-gray-400">View and review changes</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-vibegreen-500 transition-colors" />
          </a>

          <a
            href={branchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors group"
          >
            <div className="flex items-center gap-3">
              <GitBranch className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-semibold text-white">Branch: {branchName}</p>
                <p className="text-sm text-gray-400">View branch changes</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-vibegreen-500 transition-colors" />
          </a>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full bg-vibegreen-500 hover:bg-vibegreen-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

