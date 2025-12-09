import { X, Shield } from 'lucide-react';

interface LoginPromptModalProps {
  onClose: () => void;
  message?: string;
}

export default function LoginPromptModal({ onClose, message }: LoginPromptModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-effect rounded-lg max-w-md w-full border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-vibegreen-500" />
            <h2 className="text-xl font-semibold">Login Required</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-gray-400 mb-6 leading-relaxed">
          {message || 'Please log in with GitHub using the "Login with GitHub" button in the header to scan repositories and test for vulnerabilities.'}
        </p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-vibegreen-500 hover:bg-vibegreen-600 rounded-lg font-semibold transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

