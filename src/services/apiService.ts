import { getApiBaseUrl } from '../utils/apiUrl';

const API_BASE_URL = getApiBaseUrl();

export interface ScanStatus {
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  progress: number;
  logs: Array<{ message: string; status: 'active' | 'complete' }>;
}

export interface ScanResult {
  id: string;
  url: string;
  score: number;
  timestamp: string;
  vulnerabilities: Array<{
    id: string;
    title: string;
    description: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    location: string;
    filePath?: string;
    lineNumber?: number;
  }>;
  techStack: string[];
}

export const startScan = async (repositoryUrl: string, token: string): Promise<{ scanId: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ repositoryUrl }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to start scan');
  }

  return response.json();
};

export const getScanStatus = async (scanId: string, token: string): Promise<ScanStatus> => {
  const response = await fetch(`${API_BASE_URL}/api/scan/${scanId}/status`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get scan status');
  }

  return response.json();
};

export const getScanResults = async (scanId: string, token: string): Promise<ScanResult> => {
  const response = await fetch(`${API_BASE_URL}/api/scan/${scanId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get scan results');
  }

  return response.json();
};

export const getCurrentUser = async (token: string) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
};

export const getUserRepos = async (token: string): Promise<Array<{ name: string; full_name: string; html_url: string; private: boolean }>> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/repos`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get repositories');
  }

  return response.json();
};

export const saveGeminiApiKey = async (token: string, apiKey: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/gemini-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ apiKey }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save API key');
  }
};

export const deleteGeminiApiKey = async (token: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/gemini-key`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete API key');
  }
};

export const updateGeminiModel = async (token: string, model: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/gemini-model`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ model }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update model preference');
  }
};

export const checkRepositoryAccess = async (token: string, repositoryUrl: string): Promise<{ hasAccess: boolean; permission?: string; isOwner?: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/api/scan/check-access`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ repositoryUrl }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to check repository access');
  }

  return response.json();
};

export interface FileChange {
  filePath: string;
  isNewFile: boolean;
  changes: Array<{
    lineNumber: number;
    type: 'added' | 'removed' | 'modified';
    content: string;
  }>;
  fullContent?: string;
}

export interface FixData {
  files: FileChange[];
  summary: string;
}

export const generateFixWithAI = async (
  token: string,
  vulnerability: { id: string; title: string; description: string; severity: string; location: string },
  techStack: string[],
  repositoryUrl: string,
  useExisting?: boolean
): Promise<{ fix: FixData; attemptNumber: number; cached: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/api/ai/generate-fix`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ vulnerability, techStack, repositoryUrl, useExisting }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate fix');
  }

  return response.json();
};

export const applyFixToRepository = async (
  token: string,
  vulnerabilityId: string,
  repositoryUrl: string,
  attemptNumber?: number
): Promise<{ success: boolean; branchName: string; branchUrl: string; prUrl: string; prNumber: number; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/ai/apply-fix`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ vulnerabilityId, repositoryUrl, attemptNumber }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to apply fix');
  }

  return response.json();
};

export const repromptFix = async (
  token: string,
  vulnerability: { id: string; title: string; description: string; severity: string; location: string },
  techStack: string[],
  repositoryUrl: string
): Promise<{ fix: FixData; attemptNumber: number; cached: boolean }> => {
  // Reprompt is just generate-fix with useExisting=false
  return generateFixWithAI(token, vulnerability, techStack, repositoryUrl, false);
};

