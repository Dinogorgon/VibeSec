import { promises as fs } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { Vulnerability, Severity } from '../types/index.js';

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next'];
const CODE_FILE_EXTENSIONS = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'php', 'rb', 'go', 'cs'];

interface AccessControlPattern {
  name: string;
  pattern: RegExp;
  severity: Severity;
  description: string;
}

const ACCESS_CONTROL_PATTERNS: AccessControlPattern[] = [
  {
    name: 'Route without Authentication Middleware',
    pattern: /(router\.(get|post|put|delete|patch)|app\.(get|post|put|delete|patch))\s*\([^,)]*['"`][^'"`]*['"`]\s*,\s*(async\s*)?\([^)]*\)\s*=>/gi,
    severity: 'High',
    description: 'API route handler found without authentication middleware. Verify authorization is enforced.',
  },
  {
    name: 'Database Query without User Context',
    pattern: /(query|execute|findOne|findById|findByPk|find)\s*\([^)]*\b(req\.params\.id|params\.id|query\.id|body\.id)\b[^)]*\)/gi,
    severity: 'High',
    description: 'Database query uses user-provided ID without verifying ownership, potentially vulnerable to IDOR.',
  },
  {
    name: 'Supabase Query without RLS',
    pattern: /(supabase|createClient)\.(from|rpc)\s*\([^)]*\)\.(select|insert|update|delete|upsert)\s*\(/gi,
    severity: 'Medium',
    description: 'Supabase query detected. Verify Row Level Security (RLS) policies are enabled on the table.',
  },
  {
    name: 'Missing Authorization Check',
    pattern: /(req\.params\.id|params\.id|query\.id|body\.id)\s*[^=]*[=:]\s*[^;]*;\s*(?!.*(if|check|verify|validate|authorize|permission|role|user|owner|belongs))/gi,
    severity: 'Medium',
    description: 'User-provided ID used without apparent authorization check. Verify access control is enforced.',
  },
  {
    name: 'Direct Object Reference',
    pattern: /(findById|findByPk|findOne|getById)\s*\(\s*(req\.params\.id|params\.id|query\.id|body\.id)\s*\)/gi,
    severity: 'High',
    description: 'Direct object reference using user-provided ID without ownership verification, vulnerable to IDOR.',
  },
  {
    name: 'Missing Role Check',
    pattern: /(router\.(get|post|put|delete|patch)|app\.(get|post|put|delete|patch))\s*\([^,)]*['"`](admin|user|delete|update|create)[^'"`]*['"`]/gi,
    severity: 'Medium',
    description: 'Route with sensitive operation detected. Verify role-based access control (RBAC) is enforced.',
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

function hasAuthorizationCheck(content: string, matchIndex: number): boolean {
  // Check if there's authorization middleware or checks nearby
  const context = content.substring(Math.max(0, matchIndex - 1000), Math.min(content.length, matchIndex + 500));
  
  const authPatterns = [
    /authenticateToken|requireAuth|checkAuth|verifyToken/i,
    /checkRole|hasRole|requireRole|isAdmin|isUser/i,
    /authorize|permission|access|ownership|belongsTo|isOwner/i,
    /req\.user|user\.id|userId|ownerId/i,
    /middleware.*auth|auth.*middleware/i,
  ];
  
  return authPatterns.some(pattern => pattern.test(context));
}

export async function scanAccessControlVulnerabilities(
  repoPath: string,
  scanId: string
): Promise<Vulnerability[]> {
  const vulnerabilities: Vulnerability[] = [];
  const files = await getAllCodeFiles(repoPath);
  
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const relativePath = relative(repoPath, file);
      
      for (const pattern of ACCESS_CONTROL_PATTERNS) {
        const matches = Array.from(content.matchAll(pattern.pattern));
        
        for (const match of matches) {
          const matchIndex = match.index!;
          
          // Skip if it's in a comment
          const beforeMatch = content.substring(Math.max(0, matchIndex - 200), matchIndex);
          const isInComment = /\/\/.*$|\/\*[\s\S]*?\*\//m.test(beforeMatch);
          
          if (isInComment) {
            continue;
          }
          
          // Check if authorization exists
          if (hasAuthorizationCheck(content, matchIndex)) {
            // Still flag it but with lower severity
            const lineNumber = getLineNumber(content, matchIndex);
            
            vulnerabilities.push({
              id: `${scanId}-access-${vulnerabilities.length + 1}`,
              scanId,
              title: `Access Control Review: ${pattern.name}`,
              description: `${pattern.description} Authorization check detected, but verify it's comprehensive.`,
              severity: 'Low',
              location: `${relativePath}:${lineNumber}`,
              filePath: relativePath,
              lineNumber,
            });
            continue;
          }
          
          const lineNumber = getLineNumber(content, matchIndex);
          
          vulnerabilities.push({
            id: `${scanId}-access-${vulnerabilities.length + 1}`,
            scanId,
            title: `Broken Access Control: ${pattern.name}`,
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

