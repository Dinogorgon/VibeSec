export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface Vulnerability {
  id: string;
  scanId: string;
  title: string;
  description: string;
  severity: Severity;
  location: string;
  filePath?: string;
  lineNumber?: number;
}

export interface ScanResult {
  id: string;
  url: string;
  score: number;
  timestamp: string;
  vulnerabilities: Vulnerability[];
  techStack: string[];
}

export interface ScanStatus {
  id: string;
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  progress: number;
  logs: Array<{ message: string; status: 'active' | 'complete' }>;
}

export interface User {
  id: string;
  githubId: number;
  githubUsername: string;
  createdAt: string;
}

export interface Scan {
  id: string;
  userId: string;
  repositoryUrl: string;
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  progress: number;
  techStack: string[] | null;
  score: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

