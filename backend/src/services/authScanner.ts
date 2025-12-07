import { promises as fs } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { Vulnerability, Severity } from '../types/index.js';

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next'];
const CODE_FILE_EXTENSIONS = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'php', 'rb', 'go', 'cs'];

interface AuthPattern {
  name: string;
  pattern: RegExp;
  severity: Severity;
  description: string;
}

const AUTH_PATTERNS: AuthPattern[] = [
  {
    name: 'Weak Password Requirements',
    pattern: /(password|passwd).*\.(length|len)\s*[<>=]\s*([0-7]|8\s*[<>=])/gi,
    severity: 'Medium',
    description: 'Password validation allows passwords shorter than 8 characters. Enforce minimum 8 characters.',
  },
  {
    name: 'Missing Password Complexity',
    pattern: /password.*validation|validate.*password/gi,
    severity: 'Low',
    description: 'Password validation detected. Verify it enforces complexity (uppercase, lowercase, numbers, special chars).',
  },
  {
    name: 'JWT without Expiration',
    pattern: /(jwt\.sign|jsonwebtoken\.sign|encode)\s*\([^)]*\{[^}]*\}\s*,\s*[^,)]*\)/gi,
    severity: 'High',
    description: 'JWT token creation detected. Verify expiration (exp) claim is set to prevent indefinite token validity.',
  },
  {
    name: 'JWT with Weak Secret',
    pattern: /(jwt\.sign|jsonwebtoken\.sign|encode)\s*\([^,)]*,\s*['"](secret|key|password|123|test)['"]/gi,
    severity: 'Critical',
    description: 'JWT uses weak or hardcoded secret. Use strong, randomly generated secrets stored in environment variables.',
  },
  {
    name: 'Session without Secure Flag',
    pattern: /(session|cookie).*secure\s*[:=]\s*(false|0|undefined|null)/gi,
    severity: 'High',
    description: 'Session cookie without secure flag. Cookies should only be sent over HTTPS.',
  },
  {
    name: 'Session without HttpOnly Flag',
    pattern: /(session|cookie).*httpOnly\s*[:=]\s*(false|0|undefined|null)/gi,
    severity: 'Medium',
    description: 'Session cookie without httpOnly flag. Cookies should not be accessible via JavaScript to prevent XSS attacks.',
  },
  {
    name: 'Missing Rate Limiting on Login',
    pattern: /(router\.(post|get)|app\.(post|get))\s*\([^,)]*['"`](login|signin|auth|authenticate)[^'"`]*['"`]/gi,
    severity: 'High',
    description: 'Login endpoint detected. Verify rate limiting is implemented to prevent brute force attacks.',
  },
  {
    name: 'Password Reset without Token Expiration',
    pattern: /(password.*reset|reset.*password|forgot.*password)/gi,
    severity: 'Medium',
    description: 'Password reset functionality detected. Verify reset tokens expire after a reasonable time (e.g., 1 hour).',
  },
  {
    name: 'Missing MFA Enforcement',
    pattern: /(login|signin|authenticate|auth)\s*\(/gi,
    severity: 'Low',
    description: 'Authentication endpoint detected. Consider implementing multi-factor authentication (MFA) for enhanced security.',
  },
  {
    name: 'Credential Storage in Plain Text',
    pattern: /(password|passwd|credential).*[=:]\s*['"]([^'"]+)['"]/gi,
    severity: 'Critical',
    description: 'Password or credential stored in plain text. Always hash passwords before storage.',
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

function hasSecurityMeasures(content: string, matchIndex: number, pattern: AuthPattern): boolean {
  const context = content.substring(Math.max(0, matchIndex - 1000), Math.min(content.length, matchIndex + 500));
  
  // Check for security measures based on pattern type
  if (pattern.name.includes('Rate Limiting')) {
    return /rateLimit|rate.*limit|throttle|limiter/i.test(context);
  }
  
  if (pattern.name.includes('JWT')) {
    const hasExpiration = /exp\s*[:=]|expiresIn|expires|expiration/i.test(context);
    const hasStrongSecret = /process\.env|config\.|SECRET|JWT_SECRET/i.test(context);
    return hasExpiration && hasStrongSecret;
  }
  
  if (pattern.name.includes('Session')) {
    return /secure\s*[:=]\s*true|httpOnly\s*[:=]\s*true/i.test(context);
  }
  
  if (pattern.name.includes('Password Reset')) {
    return /expire|expiration|ttl|timeout/i.test(context);
  }
  
  if (pattern.name.includes('Password Complexity')) {
    return /(uppercase|lowercase|number|digit|special|symbol|complexity)/i.test(context);
  }
  
  return false;
}

export async function scanAuthVulnerabilities(
  repoPath: string,
  scanId: string
): Promise<Vulnerability[]> {
  const vulnerabilities: Vulnerability[] = [];
  const files = await getAllCodeFiles(repoPath);
  
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const relativePath = relative(repoPath, file);
      
      for (const pattern of AUTH_PATTERNS) {
        const matches = Array.from(content.matchAll(pattern.pattern));
        
        for (const match of matches) {
          const matchIndex = match.index!;
          
          // Skip if it's in a comment
          const beforeMatch = content.substring(Math.max(0, matchIndex - 200), matchIndex);
          const isInComment = /\/\/.*$|\/\*[\s\S]*?\*\//m.test(beforeMatch);
          
          if (isInComment) {
            continue;
          }
          
          // Check if security measures exist
          if (hasSecurityMeasures(content, matchIndex, pattern)) {
            // Still flag it but with lower severity
            const lineNumber = getLineNumber(content, matchIndex);
            
            vulnerabilities.push({
              id: `${scanId}-auth-${vulnerabilities.length + 1}`,
              scanId,
              title: `Authentication Review: ${pattern.name}`,
              description: `${pattern.description} Security measures detected, but verify they're comprehensive.`,
              severity: 'Low',
              location: `${relativePath}:${lineNumber}`,
              filePath: relativePath,
              lineNumber,
            });
            continue;
          }
          
          const lineNumber = getLineNumber(content, matchIndex);
          
          vulnerabilities.push({
            id: `${scanId}-auth-${vulnerabilities.length + 1}`,
            scanId,
            title: `Authentication Failure: ${pattern.name}`,
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

