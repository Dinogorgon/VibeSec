import { promises as fs } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { Vulnerability, Severity } from '../types/index.js';

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next'];
const CODE_FILE_EXTENSIONS = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'php', 'rb', 'go', 'cs'];

interface LoggingPattern {
  name: string;
  pattern: RegExp;
  severity: Severity;
  description: string;
}

const LOGGING_PATTERNS: LoggingPattern[] = [
  {
    name: 'Sensitive Data in Logs',
    pattern: /(console\.(log|error|warn|info)|logger\.(info|debug|error|warn)|print|log)\s*\([^)]*\b(password|token|secret|key|api[_-]?key|auth|credential|ssn|credit[_-]?card)['"]/gi,
    severity: 'High',
    description: 'Sensitive data (passwords, tokens, secrets) logged to console or logs. Remove or sanitize logs in production.',
  },
  {
    name: 'Missing Authentication Logging',
    pattern: /(router\.(post|get)|app\.(post|get))\s*\([^,)]*['"`](login|signin|auth|authenticate)[^'"`]*['"`]/gi,
    severity: 'Medium',
    description: 'Authentication endpoint detected. Verify failed login attempts and authentication events are logged for security monitoring.',
  },
  {
    name: 'Missing Error Logging',
    pattern: /(try\s*\{|catch\s*\(|error\s*\(|exception)/gi,
    severity: 'Low',
    description: 'Error handling detected. Verify errors are logged for security monitoring and debugging.',
  },
  {
    name: 'Missing Audit Trail',
    pattern: /(router\.(put|delete|patch)|app\.(put|delete|patch))\s*\(/gi,
    severity: 'Medium',
    description: 'Data modification endpoint detected. Verify audit logging is implemented for sensitive operations.',
  },
  {
    name: 'Missing Security Event Logging',
    pattern: /(router\.(post|put|delete)|app\.(post|put|delete))\s*\(/gi,
    severity: 'Low',
    description: 'API endpoint detected. Consider implementing security event logging for monitoring and incident response.',
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

function hasLogging(content: string, matchIndex: number, pattern: LoggingPattern): boolean {
  const context = content.substring(Math.max(0, matchIndex - 1000), Math.min(content.length, matchIndex + 500));
  
  if (pattern.name.includes('Sensitive Data')) {
    // This is a positive finding, don't reduce severity
    return false;
  }
  
  if (pattern.name.includes('Authentication Logging')) {
    return /log.*(auth|login|signin|fail)|(auth|login|signin|fail).*log|audit.*(auth|login)/i.test(context);
  }
  
  if (pattern.name.includes('Error Logging')) {
    return /(log|logger|console)\.(error|warn|log)/i.test(context);
  }
  
  if (pattern.name.includes('Audit Trail')) {
    return /audit|log.*(create|update|delete|modify)|(create|update|delete|modify).*log/i.test(context);
  }
  
  if (pattern.name.includes('Security Event')) {
    return /(log|logger|audit|monitor)/i.test(context);
  }
  
  return false;
}

export async function scanLoggingVulnerabilities(
  repoPath: string,
  scanId: string
): Promise<Vulnerability[]> {
  const vulnerabilities: Vulnerability[] = [];
  const files = await getAllCodeFiles(repoPath);
  
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const relativePath = relative(repoPath, file);
      
      for (const pattern of LOGGING_PATTERNS) {
        const matches = Array.from(content.matchAll(pattern.pattern));
        
        for (const match of matches) {
          const matchIndex = match.index!;
          
          // Skip if it's in a comment
          const beforeMatch = content.substring(Math.max(0, matchIndex - 200), matchIndex);
          const isInComment = /\/\/.*$|\/\*[\s\S]*?\*\//m.test(beforeMatch);
          
          if (isInComment) {
            continue;
          }
          
          // Skip if it's in test files (except for sensitive data logging)
          const isTestFile = /test|spec|example|demo|sample/i.test(relativePath);
          if (isTestFile && !pattern.name.includes('Sensitive Data')) {
            continue;
          }
          
          // Check if logging exists
          if (hasLogging(content, matchIndex, pattern)) {
            // Still flag it but with lower severity
            const lineNumber = getLineNumber(content, matchIndex);
            
            vulnerabilities.push({
              id: `${scanId}-logging-${vulnerabilities.length + 1}`,
              scanId,
              title: `Logging Review: ${pattern.name}`,
              description: `${pattern.description} Logging detected, but verify it's comprehensive.`,
              severity: 'Low',
              location: `${relativePath}:${lineNumber}`,
              filePath: relativePath,
              lineNumber,
            });
            continue;
          }
          
          const lineNumber = getLineNumber(content, matchIndex);
          
          vulnerabilities.push({
            id: `${scanId}-logging-${vulnerabilities.length + 1}`,
            scanId,
            title: `Logging and Monitoring Failure: ${pattern.name}`,
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

