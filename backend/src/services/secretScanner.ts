import { promises as fs } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { Vulnerability, Severity } from '../types/index.js';

interface SecretPattern {
  name: string;
  pattern: RegExp;
  severity: Severity;
}

const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: 'API Key',
    pattern: /(api[_-]?key|apikey)\s*[=:]\s*['"]?([a-zA-Z0-9\-_]{20,})['"]?/gi,
    severity: 'Critical',
  },
  {
    name: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/g,
    severity: 'Critical',
  },
  {
    name: 'AWS Secret Key',
    pattern: /aws[_-]?secret[_-]?access[_-]?key\s*[=:]\s*['"]?([a-zA-Z0-9/+=]{40})['"]?/gi,
    severity: 'Critical',
  },
  {
    name: 'Supabase Service Key',
    pattern: /(supabase[_-]?(service[_-]?role[_-]?key|anon[_-]?key))\s*[=:]\s*['"]?([a-zA-Z0-9\-_]{20,})['"]?/gi,
    severity: 'Critical',
  },
  {
    name: 'JWT Secret',
    pattern: /(jwt[_-]?secret|secret[_-]?key|session[_-]?secret)\s*[=:]\s*['"]?([a-zA-Z0-9\-_]{20,})['"]?/gi,
    severity: 'High',
  },
  {
    name: 'Database Password',
    pattern: /(database[_-]?password|db[_-]?pass|postgres[_-]?password)\s*[=:]\s*['"]?([^\s'"]{8,})['"]?/gi,
    severity: 'Critical',
  },
  {
    name: 'OAuth Client Secret',
    pattern: /(oauth[_-]?client[_-]?secret|client[_-]?secret)\s*[=:]\s*['"]?([a-zA-Z0-9\-_]{20,})['"]?/gi,
    severity: 'High',
  },
  {
    name: 'Stripe Secret Key',
    pattern: /(stripe[_-]?(secret[_-]?key|api[_-]?key))\s*[=:]\s*['"]?(sk_[a-zA-Z0-9]{24,})['"]?/gi,
    severity: 'Critical',
  },
  {
    name: 'GitHub Token',
    pattern: /(github[_-]?(token|pat|personal[_-]?access[_-]?token))\s*[=:]\s*['"]?(ghp_[a-zA-Z0-9]{36})['"]?/gi,
    severity: 'Critical',
  },
  {
    name: 'Private Key',
    pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/gi,
    severity: 'Critical',
  },
];

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', '.vscode', '.idea'];
const EXCLUDE_FILES = ['.gitignore', '.env.example', 'package-lock.json', 'yarn.lock'];

function shouldExcludePath(filePath: string, basePath: string): boolean {
  const relativePath = relative(basePath, filePath);
  const parts = relativePath.split(/[/\\]/);
  
  return parts.some(part => 
    EXCLUDE_DIRS.includes(part) || 
    part.startsWith('.') && part !== '.env'
  );
}

function getLineNumber(content: string, index: number): number {
  return content.substring(0, index).split('\n').length;
}

async function getAllFiles(dirPath: string, basePath: string = dirPath): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await readdir(dirPath);
    
    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      
      if (shouldExcludePath(fullPath, basePath)) {
        continue;
      }
      
      if (EXCLUDE_FILES.includes(entry)) {
        continue;
      }
      
      const stats = await stat(fullPath);
      
      if (stats.isDirectory()) {
        const subFiles = await getAllFiles(fullPath, basePath);
        files.push(...subFiles);
      } else if (stats.isFile()) {
        // Only scan text files
        const ext = entry.split('.').pop()?.toLowerCase();
        const textExtensions = ['js', 'ts', 'jsx', 'tsx', 'json', 'env', 'py', 'java', 'go', 'rs', 'php', 'rb', 'sql', 'sh', 'yaml', 'yml', 'md', 'txt'];
        
        if (!ext || textExtensions.includes(ext) || entry.startsWith('.env')) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }
  
  return files;
}

export async function scanForSecrets(
  repoPath: string,
  scanId: string
): Promise<Vulnerability[]> {
  const vulnerabilities: Vulnerability[] = [];
  const files = await getAllFiles(repoPath);
  
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const relativePath = relative(repoPath, file);
      
      for (const pattern of SECRET_PATTERNS) {
        const matches = Array.from(content.matchAll(pattern.pattern));
        
        for (const match of matches) {
          // Skip if it's in a comment or string that's clearly a placeholder
          const beforeMatch = content.substring(Math.max(0, match.index! - 50), match.index!);
          const isPlaceholder = /example|placeholder|your[_-]?|replace|change|TODO/i.test(beforeMatch);
          
          if (isPlaceholder) {
            continue;
          }
          
          const lineNumber = getLineNumber(content, match.index!);
          
          vulnerabilities.push({
            id: `${scanId}-${vulnerabilities.length + 1}`,
            scanId,
            title: `Exposed ${pattern.name}`,
            description: `A ${pattern.name.toLowerCase()} was found hardcoded in the codebase. This should be moved to environment variables and never committed to version control.`,
            severity: pattern.severity,
            location: `${relativePath}:${lineNumber}`,
            filePath: relativePath,
            lineNumber,
          });
        }
      }
    } catch (error) {
      // Skip binary files or files that can't be read
      continue;
    }
  }
  
  return vulnerabilities;
}

