import { promises as fs } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { Vulnerability, Severity } from '../types/index.js';

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next'];
const CODE_FILE_EXTENSIONS = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'php', 'rb', 'go', 'cs'];

interface MisconfigurationPattern {
  name: string;
  pattern: RegExp;
  severity: Severity;
  description: string;
}

const MISCONFIGURATION_PATTERNS: MisconfigurationPattern[] = [
  {
    name: 'Overly Permissive CORS',
    pattern: /(cors|cors\(\)|enableCors)\s*\(\s*\{[^}]*origin\s*[:=]\s*['"`]\*['"`]/gi,
    severity: 'High',
    description: 'CORS configured to allow all origins (*). This is insecure and should be restricted to specific domains.',
  },
  {
    name: 'CORS with Credentials and Wildcard',
    pattern: /(cors|cors\(\)|enableCors)\s*\(\s*\{[^}]*credentials\s*[:=]\s*true[^}]*origin\s*[:=]\s*['"`]\*['"`]/gi,
    severity: 'Critical',
    description: 'CORS allows credentials with wildcard origin. This is a critical security misconfiguration.',
  },
  {
    name: 'Missing Security Headers',
    pattern: /(app\.use|router\.use|middleware)\s*\([^)]*(helmet|security|headers)/gi,
    severity: 'Medium',
    description: 'Security headers middleware detected. Verify CSP, HSTS, X-Frame-Options, and X-Content-Type-Options are configured.',
  },
  {
    name: 'Debug Mode in Production',
    pattern: /(NODE_ENV|DEBUG|debug)\s*[!=]=\s*['"](production|prod)['"]/gi,
    severity: 'High',
    description: 'Debug mode or non-production environment check detected. Verify debug mode is disabled in production.',
  },
  {
    name: 'Exposed Error Messages',
    pattern: /(error|exception|throw).*message|\.send\(.*error|\.json\(.*error/gi,
    severity: 'Medium',
    description: 'Error messages may expose sensitive information. Verify error messages are sanitized in production.',
  },
  {
    name: 'Missing Rate Limiting',
    pattern: /(router\.(get|post|put|delete|patch)|app\.(get|post|put|delete|patch))\s*\(/gi,
    severity: 'Low',
    description: 'API route detected. Verify rate limiting is implemented to prevent abuse.',
  },
  {
    name: 'Default Credentials',
    pattern: /(username|user|login|admin)\s*[=:]\s*['"](admin|root|user|test|default|password|123456)['"]/gi,
    severity: 'Critical',
    description: 'Default credentials detected in code. Change default usernames and passwords immediately.',
  },
  {
    name: 'Sensitive Data in Console Logs',
    pattern: /(console\.(log|error|warn|info)|print|logger\.(info|debug|error))\s*\([^)]*\b(password|token|secret|key|api[_-]?key|auth)['"]/gi,
    severity: 'High',
    description: 'Sensitive data (passwords, tokens, secrets) logged to console. Remove or sanitize logs in production.',
  },
  {
    name: 'Missing HTTPS Enforcement',
    pattern: /(app\.listen|server\.listen|createServer)\s*\([^)]*http[^)]*\)/gi,
    severity: 'High',
    description: 'HTTP server detected. Verify HTTPS is enforced in production and HTTP requests are redirected.',
  },
  {
    name: 'Exposed API Keys in Frontend',
    pattern: /(VITE_|REACT_APP_|NEXT_PUBLIC_)(API_KEY|SECRET|TOKEN|KEY)/gi,
    severity: 'High',
    description: 'API keys or secrets exposed in frontend environment variables. These are visible to clients and should not contain sensitive data.',
  },
];

function shouldExcludePath(filePath: string, basePath: string): boolean {
  const relativePath = relative(basePath, filePath);
  const parts = relativePath.split(/[/\\]/);
  return parts.some(part => EXCLUDE_DIRS.includes(part));
}

function getLineNumber(content: string, index: number): number {
  return content.substring(0, index).split('\n').length;
}

async function getAllCodeFiles(dirPath: string, basePath: string = dirPath): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await readdir(dirPath);
    
    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      
      if (shouldExcludePath(fullPath, basePath)) {
        continue;
      }
      
      const stats = await stat(fullPath);
      
      if (stats.isDirectory()) {
        const subFiles = await getAllCodeFiles(fullPath, basePath);
        files.push(...subFiles);
      } else if (stats.isFile()) {
        const ext = entry.split('.').pop()?.toLowerCase();
        if (ext && CODE_FILE_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }
  
  return files;
}

function hasSecurityConfiguration(content: string, matchIndex: number, pattern: MisconfigurationPattern): boolean {
  const context = content.substring(Math.max(0, matchIndex - 1000), Math.min(content.length, matchIndex + 500));
  
  if (pattern.name.includes('CORS')) {
    // Check if CORS is properly configured
    const hasSpecificOrigin = /origin\s*[:=]\s*['"`](?!\*)[^'"`]+['"`]/i.test(context);
    return hasSpecificOrigin;
  }
  
  if (pattern.name.includes('Security Headers')) {
    return /helmet|security.*headers|csp|hsts|x-frame-options/i.test(context);
  }
  
  if (pattern.name.includes('Debug Mode')) {
    return /NODE_ENV\s*[=:]\s*['"]production['"]/i.test(context);
  }
  
  if (pattern.name.includes('Rate Limiting')) {
    return /rateLimit|rate.*limit|throttle|limiter/i.test(context);
  }
  
  if (pattern.name.includes('HTTPS')) {
    return /https|ssl|tls|secure/i.test(context);
  }
  
  return false;
}

export async function scanMisconfigurationVulnerabilities(
  repoPath: string,
  scanId: string
): Promise<Vulnerability[]> {
  const vulnerabilities: Vulnerability[] = [];
  const files = await getAllCodeFiles(repoPath);
  
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const relativePath = relative(repoPath, file);
      
      for (const pattern of MISCONFIGURATION_PATTERNS) {
        const matches = Array.from(content.matchAll(pattern.pattern));
        
        for (const match of matches) {
          const matchIndex = match.index!;
          
          // Skip if it's in a comment
          const beforeMatch = content.substring(Math.max(0, matchIndex - 200), matchIndex);
          const isInComment = /\/\/.*$|\/\*[\s\S]*?\*\//m.test(beforeMatch);
          
          if (isInComment) {
            continue;
          }
          
          // Skip if it's in test files
          const isTestFile = /test|spec|example|demo|sample/i.test(relativePath);
          if (isTestFile && pattern.name.includes('Default Credentials')) {
            continue;
          }
          
          // Check if security configuration exists
          if (hasSecurityConfiguration(content, matchIndex, pattern)) {
            // Still flag it but with lower severity
            const lineNumber = getLineNumber(content, matchIndex);
            
            vulnerabilities.push({
              id: `${scanId}-misconfig-${vulnerabilities.length + 1}`,
              scanId,
              title: `Security Misconfiguration Review: ${pattern.name}`,
              description: `${pattern.description} Security configuration detected, but verify it's comprehensive.`,
              severity: 'Low',
              location: `${relativePath}:${lineNumber}`,
              filePath: relativePath,
              lineNumber,
            });
            continue;
          }
          
          const lineNumber = getLineNumber(content, matchIndex);
          
          vulnerabilities.push({
            id: `${scanId}-misconfig-${vulnerabilities.length + 1}`,
            scanId,
            title: `Security Misconfiguration: ${pattern.name}`,
            description: pattern.description,
            severity: pattern.severity,
            location: `${relativePath}:${lineNumber}`,
            filePath: relativePath,
            lineNumber,
          });
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  return vulnerabilities;
}

