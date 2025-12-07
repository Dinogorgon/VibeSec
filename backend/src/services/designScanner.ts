import { promises as fs } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { Vulnerability, Severity } from '../types/index.js';

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next'];
const CODE_FILE_EXTENSIONS = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'php', 'rb', 'go', 'cs'];

interface DesignPattern {
  name: string;
  pattern: RegExp;
  severity: Severity;
  description: string;
}

const DESIGN_PATTERNS: DesignPattern[] = [
  {
    name: 'File Upload without Type Validation',
    pattern: /(multer|upload|fileUpload|formidable|busboy)\s*\([^)]*\)/gi,
    severity: 'High',
    description: 'File upload functionality detected. Verify file type validation, size limits, and malicious file scanning are implemented.',
  },
  {
    name: 'File Upload without Size Limit',
    pattern: /(multer|upload|fileUpload)\s*\([^)]*\)/gi,
    severity: 'Medium',
    description: 'File upload detected. Verify size limits are enforced to prevent DoS attacks.',
  },
  {
    name: 'Missing CSRF Protection',
    pattern: /(router\.(post|put|delete|patch)|app\.(post|put|delete|patch))\s*\(/gi,
    severity: 'High',
    description: 'State-changing HTTP method detected. Verify CSRF protection is implemented (CSRF tokens, SameSite cookies).',
  },
  {
    name: 'Direct Database Access',
    pattern: /(query|execute|raw)\s*\([^)]*\b(SELECT|INSERT|UPDATE|DELETE)\s+/gi,
    severity: 'Medium',
    description: 'Direct database queries detected. Consider using ORM or query builder with built-in security features.',
  },
  {
    name: 'Missing Input Sanitization',
    pattern: /(req\.(body|params|query)|params|query|body)\.[a-zA-Z]+/gi,
    severity: 'Low',
    description: 'User input access detected. Verify input sanitization and validation are implemented.',
  },
  {
    name: 'Missing Input Validation',
    pattern: /(router\.(post|put|patch)|app\.(post|put|patch))\s*\([^,)]*,\s*(async\s*)?\([^)]*req/gi,
    severity: 'Low',
    description: 'API endpoint with request body detected. Verify input validation middleware is implemented.',
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

function hasSecurityMeasures(content: string, matchIndex: number, pattern: DesignPattern): boolean {
  const context = content.substring(Math.max(0, matchIndex - 1000), Math.min(content.length, matchIndex + 500));
  
  if (pattern.name.includes('File Upload')) {
    const hasTypeValidation = /(mimetype|filetype|extension|\.(jpg|png|pdf|doc))/i.test(context);
    const hasSizeLimit = /(limits|maxSize|fileSize|size.*limit)/i.test(context);
    return hasTypeValidation && hasSizeLimit;
  }
  
  if (pattern.name.includes('CSRF')) {
    return /(csrf|csurf|csrfToken|sameSite)/i.test(context);
  }
  
  if (pattern.name.includes('Input Sanitization')) {
    return /(sanitize|escape|validate|validator|joi|yup|zod)/i.test(context);
  }
  
  if (pattern.name.includes('Input Validation')) {
    return /(validate|validator|joi|yup|zod|express-validator)/i.test(context);
  }
  
  if (pattern.name.includes('Direct Database')) {
    return /(orm|sequelize|typeorm|prisma|mongoose|knex)/i.test(context);
  }
  
  return false;
}

export async function scanDesignVulnerabilities(
  repoPath: string,
  scanId: string
): Promise<Vulnerability[]> {
  const vulnerabilities: Vulnerability[] = [];
  const files = await getAllCodeFiles(repoPath);
  
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const relativePath = relative(repoPath, file);
      
      for (const pattern of DESIGN_PATTERNS) {
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
          if (isTestFile) {
            continue;
          }
          
          // Check if security measures exist
          if (hasSecurityMeasures(content, matchIndex, pattern)) {
            // Still flag it but with lower severity
            const lineNumber = getLineNumber(content, matchIndex);
            
            vulnerabilities.push({
              id: `${scanId}-design-${vulnerabilities.length + 1}`,
              scanId,
              title: `Design Review: ${pattern.name}`,
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
            id: `${scanId}-design-${vulnerabilities.length + 1}`,
            scanId,
            title: `Insecure Design: ${pattern.name}`,
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

