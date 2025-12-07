import { promises as fs } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { Vulnerability, Severity } from '../types/index.js';

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next'];
const CODE_FILE_EXTENSIONS = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'php', 'rb', 'go', 'cs'];

interface IntegrityPattern {
  name: string;
  pattern: RegExp;
  severity: Severity;
  description: string;
}

const INTEGRITY_PATTERNS: IntegrityPattern[] = [
  {
    name: 'Insecure Deserialization',
    pattern: /(JSON\.parse|eval|Function)\s*\(\s*[^,)]*\b(req\.|params\.|query\.|body\.|req\[|params\[|query\[|body\[)/gi,
    severity: 'High',
    description: 'Deserialization of user-controlled input detected. This can lead to remote code execution if not properly validated.',
  },
  {
    name: 'Unsafe require() from User Input',
    pattern: /require\s*\(\s*[^,)]*\b(req\.|params\.|query\.|body\.|req\[|params\[|query\[|body\[)/gi,
    severity: 'Critical',
    description: 'require() function uses user-controlled input, allowing arbitrary module loading and code execution.',
  },
  {
    name: 'Unsafe import() from User Input',
    pattern: /import\s*\(\s*[^,)]*\b(req\.|params\.|query\.|body\.|req\[|params\[|query\[|body\[)/gi,
    severity: 'Critical',
    description: 'Dynamic import() uses user-controlled input, allowing arbitrary module loading.',
  },
  {
    name: 'Missing Dependency Lock File',
    pattern: /(package\.json|requirements\.txt|go\.mod|pom\.xml)/gi,
    severity: 'Medium',
    description: 'Dependency file detected. Verify lock files (package-lock.json, yarn.lock, etc.) are committed to ensure reproducible builds.',
  },
  {
    name: 'Unpinned Dependency Versions',
    pattern: /['"]([\^~]|>=|>)[0-9]/gi,
    severity: 'Medium',
    description: 'Dependencies use version ranges (^, ~, >=) instead of exact versions. This can lead to unexpected updates.',
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

async function checkForLockFile(repoPath: string): Promise<boolean> {
  try {
    const lockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'go.sum', 'pom.xml.lock'];
    for (const lockFile of lockFiles) {
      try {
        await stat(join(repoPath, lockFile));
        return true;
      } catch {
        // File doesn't exist
      }
    }
    return false;
  } catch {
    return false;
  }
}

function hasValidation(content: string, matchIndex: number): boolean {
  const context = content.substring(Math.max(0, matchIndex - 500), Math.min(content.length, matchIndex + 500));
  
  const validationPatterns = [
    /validate|sanitize|whitelist|allowlist|check/i,
    /JSON\.parse.*try|try.*JSON\.parse/i,
  ];
  
  return validationPatterns.some(pattern => pattern.test(context));
}

export async function scanIntegrityVulnerabilities(
  repoPath: string,
  scanId: string
): Promise<Vulnerability[]> {
  const vulnerabilities: Vulnerability[] = [];
  const files = await getAllCodeFiles(repoPath);
  const hasLockFile = await checkForLockFile(repoPath);
  
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const relativePath = relative(repoPath, file);
      
      for (const pattern of INTEGRITY_PATTERNS) {
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
          
          // For missing lock file, only check once
          if (pattern.name.includes('Lock File')) {
            if (hasLockFile) {
              continue;
            }
          }
          
          // Check if validation exists
          if (hasValidation(content, matchIndex) && !pattern.name.includes('Lock File')) {
            const lineNumber = getLineNumber(content, matchIndex);
            
            vulnerabilities.push({
              id: `${scanId}-integrity-${vulnerabilities.length + 1}`,
              scanId,
              title: `Integrity Review: ${pattern.name}`,
              description: `${pattern.description} Validation detected, but verify it's comprehensive.`,
              severity: 'Low',
              location: `${relativePath}:${lineNumber}`,
              filePath: relativePath,
              lineNumber,
            });
            continue;
          }
          
          const lineNumber = getLineNumber(content, matchIndex);
          
          vulnerabilities.push({
            id: `${scanId}-integrity-${vulnerabilities.length + 1}`,
            scanId,
            title: `Software Integrity Failure: ${pattern.name}`,
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

