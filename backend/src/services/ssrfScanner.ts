import { promises as fs } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { Vulnerability, Severity } from '../types/index.js';

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next'];
const CODE_FILE_EXTENSIONS = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'php', 'rb', 'go', 'cs'];

interface SSRFPattern {
  name: string;
  pattern: RegExp;
  severity: Severity;
  description: string;
}

const SSRF_PATTERNS: SSRFPattern[] = [
  {
    name: 'fetch() with User Input',
    pattern: /fetch\s*\(\s*[^,)]*\b(req\.|params\.|query\.|body\.|req\[|params\[|query\[|body\[|process\.argv)/gi,
    severity: 'High',
    description: 'fetch() uses user-controlled URL without validation, vulnerable to SSRF attacks.',
  },
  {
    name: 'axios() with User Input',
    pattern: /axios\.(get|post|put|delete|request)\s*\(\s*[^,)]*\b(req\.|params\.|query\.|body\.|req\[|params\[|query\[|body\[)/gi,
    severity: 'High',
    description: 'axios HTTP request uses user-controlled URL without validation, vulnerable to SSRF.',
  },
  {
    name: 'http.get() with User Input',
    pattern: /http[s]?\.(get|post|put|delete|request)\s*\(\s*[^,)]*\b(req\.|params\.|query\.|body\.|req\[|params\[|query\[|body\[)/gi,
    severity: 'High',
    description: 'HTTP module uses user-controlled URL without validation, vulnerable to SSRF.',
  },
  {
    name: 'request() with User Input',
    pattern: /request\s*\(\s*[^,)]*\b(req\.|params\.|query\.|body\.|req\[|params\[|query\[|body\[)/gi,
    severity: 'High',
    description: 'request() function uses user-controlled URL without validation, vulnerable to SSRF.',
  },
  {
    name: 'URL Construction from User Input',
    pattern: /new\s+URL\s*\(\s*[^,)]*\b(req\.|params\.|query\.|body\.|req\[|params\[|query\[|body\[)/gi,
    severity: 'Medium',
    description: 'URL constructor uses user input. Verify URL validation and whitelisting.',
  },
  {
    name: 'Template Literal URL',
    pattern: /(fetch|axios|http|request)\s*\([`'"]\s*https?:\/\/\$\{.*\}/gi,
    severity: 'High',
    description: 'HTTP request uses template literal with user input, vulnerable to SSRF.',
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

function hasURLValidation(content: string, matchIndex: number): boolean {
  // Check if there's URL validation/whitelisting nearby
  const context = content.substring(Math.max(0, matchIndex - 500), Math.min(content.length, matchIndex + 500));
  
  // Look for validation patterns
  const validationPatterns = [
    /whitelist|allowlist/i,
    /validate.*url|url.*validate/i,
    /isValidUrl|isValid.*url/i,
    /checkUrl|check.*url/i,
    /sanitize.*url|url.*sanitize/i,
    /127\.0\.0\.1|localhost|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\./i, // Internal IP checks
  ];
  
  return validationPatterns.some(pattern => pattern.test(context));
}

export async function scanSSRFVulnerabilities(
  repoPath: string,
  scanId: string
): Promise<Vulnerability[]> {
  const vulnerabilities: Vulnerability[] = [];
  const files = await getAllCodeFiles(repoPath);
  
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const relativePath = relative(repoPath, file);
      
      for (const pattern of SSRF_PATTERNS) {
        const matches = Array.from(content.matchAll(pattern.pattern));
        
        for (const match of matches) {
          const matchIndex = match.index!;
          
          // Skip if it's in a comment
          const beforeMatch = content.substring(Math.max(0, matchIndex - 200), matchIndex);
          const isInComment = /\/\/.*$|\/\*[\s\S]*?\*\//m.test(beforeMatch);
          
          if (isInComment) {
            continue;
          }
          
          // Check if URL validation exists
          if (hasURLValidation(content, matchIndex)) {
            // Still flag it but with lower severity
            const lineNumber = getLineNumber(content, matchIndex);
            
            vulnerabilities.push({
              id: `${scanId}-ssrf-${vulnerabilities.length + 1}`,
              scanId,
              title: `SSRF Risk: ${pattern.name}`,
              description: `${pattern.description} URL validation detected, but verify it's comprehensive.`,
              severity: 'Medium',
              location: `${relativePath}:${lineNumber}`,
              filePath: relativePath,
              lineNumber,
            });
            continue;
          }
          
          const lineNumber = getLineNumber(content, matchIndex);
          
          vulnerabilities.push({
            id: `${scanId}-ssrf-${vulnerabilities.length + 1}`,
            scanId,
            title: `SSRF Vulnerability: ${pattern.name}`,
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

