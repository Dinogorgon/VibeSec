import { promises as fs } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { Vulnerability, Severity } from '../types/index.js';

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next'];
const SQL_FILE_EXTENSIONS = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'php', 'rb', 'go'];

interface SQLPattern {
  name: string;
  pattern: RegExp;
  severity: Severity;
  description: string;
}

const SQL_PATTERNS: SQLPattern[] = [
  {
    name: 'Template Literal SQL',
    pattern: /(query|execute|exec)\s*\([`'"]\s*SELECT\s+.*\$\{.*\}.*[`'"]/gis,
    severity: 'High',
    description: 'SQL query uses template literals with user input, making it vulnerable to SQL injection.',
  },
  {
    name: 'String Concatenation SQL',
    pattern: /(query|execute|exec)\s*\([`'"]\s*SELECT\s+.*['"]\s*\+\s*.*\+.*SELECT/gi,
    severity: 'High',
    description: 'SQL query uses string concatenation with user input, making it vulnerable to SQL injection.',
  },
  {
    name: 'Unparameterized Query',
    pattern: /(query|execute|exec)\s*\([`'"]\s*(SELECT|INSERT|UPDATE|DELETE).*\$\{.*\}.*[`'"]/gis,
    severity: 'High',
    description: 'SQL query directly interpolates variables without parameterization.',
  },
  {
    name: 'Raw SQL with Variables',
    pattern: /(raw|sql)\s*\([`'"]\s*(SELECT|INSERT|UPDATE|DELETE).*\$\{.*\}.*[`'"]/gis,
    severity: 'High',
    description: 'Raw SQL query uses variable interpolation instead of parameterized queries.',
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
        if (ext && SQL_FILE_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }
  
  return files;
}

export async function scanSQLInjection(
  repoPath: string,
  scanId: string,
  _techStack: string[]
): Promise<Vulnerability[]> {
  const vulnerabilities: Vulnerability[] = [];
  const files = await getAllCodeFiles(repoPath);
  
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const relativePath = relative(repoPath, file);
      
      for (const pattern of SQL_PATTERNS) {
        const matches = Array.from(content.matchAll(pattern.pattern));
        
        for (const match of matches) {
          // Check if it's actually a SQL query (not a comment or string)
          const matchText = match[0];
          if (matchText.includes('//') || matchText.includes('/*')) {
            continue;
          }
          
          const lineNumber = getLineNumber(content, match.index!);
          
          vulnerabilities.push({
            id: `${scanId}-sql-${vulnerabilities.length + 1}`,
            scanId,
            title: `SQL Injection: ${pattern.name}`,
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

