export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface Vulnerability {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  location: string;
}

export interface ScanResult {
  url: string;
  score: number;
  timestamp: string;
  vulnerabilities: Vulnerability[];
  techStack: string[];
}

export type View = 'home' | 'scanning' | 'results' | 'docs' | 'pricing';

export interface User {
  id: string;
  githubId: number;
  githubUsername: string;
  avatarUrl?: string;
  hasGeminiKey?: boolean;
  geminiModel?: string;
  createdAt: string;
}

