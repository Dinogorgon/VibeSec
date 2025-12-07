import { Settings, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface ProfilePanelProps {
  user: User;
  onSettingsClick: () => void;
  onClose: () => void;
}

export default function ProfilePanel({ user, onSettingsClick, onClose }: ProfilePanelProps) {
  return (
    <div className="absolute right-0 top-full mt-2 w-64 glass-effect rounded-lg border border-gray-800 shadow-xl z-50">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-800">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={`${user.githubUsername}'s avatar`}
              className="w-10 h-10 rounded-full border border-gray-700"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.githubUsername}</p>
            <p className="text-xs text-gray-500">GitHub</p>
          </div>
        </div>

        <button
          onClick={() => {
            onSettingsClick();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-left"
        >
          <Settings className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">Profile Settings</span>
        </button>
      </div>
    </div>
  );
}

