import { Vulnerability, ScanResult } from '../types';

export const MOCK_VULNERABILITIES: Vulnerability[] = [
  {
    id: '1',
    title: 'Hardcoded Supabase Service Key',
    description: 'A Supabase service role key is hardcoded in the client-side code. This key has full database access and should never be exposed in client applications.',
    severity: 'Critical',
    location: 'src/lib/supabase.ts:23',
  },
  {
    id: '2',
    title: 'Missing Row Level Security (RLS) Policies',
    description: 'Database tables are missing Row Level Security policies, allowing unauthorized access to sensitive user data.',
    severity: 'High',
    location: 'supabase/migrations/001_initial.sql:45',
  },
  {
    id: '3',
    title: 'SQL Injection in Search Endpoint',
    description: 'User input is directly concatenated into SQL queries without parameterization, making the application vulnerable to SQL injection attacks.',
    severity: 'High',
    location: 'src/api/search.ts:67',
  },
  {
    id: '4',
    title: 'IDOR on Order Route',
    description: 'The /api/orders/:id endpoint does not verify that the requesting user owns the order, allowing access to other users\' order data.',
    severity: 'Medium',
    location: 'src/pages/api/orders/[id].ts:12',
  },
  {
    id: '5',
    title: 'Exposed .env File in Public Directory',
    description: 'Environment variables file is accessible via public URL, exposing sensitive configuration and API keys.',
    severity: 'Medium',
    location: 'public/.env',
  },
  {
    id: '6',
    title: 'Weak Password Policy',
    description: 'Application does not enforce strong password requirements, allowing users to set weak passwords that are easily compromised.',
    severity: 'Low',
    location: 'src/components/AuthForm.tsx:89',
  },
];

export const generateMockScanResult = (url: string): ScanResult => {
  return {
    url,
    score: Math.floor(Math.random() * 40) + 30, // Score between 30-70
    timestamp: new Date().toISOString(),
    vulnerabilities: MOCK_VULNERABILITIES,
    techStack: ['Next.js', 'PostgreSQL', 'Supabase', 'TypeScript', 'React'],
  };
};

