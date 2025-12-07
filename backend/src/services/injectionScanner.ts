import { promises as fs } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { Vulnerability, Severity } from '../types/index.js';

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next'];
const CODE_FILE_EXTENSIONS = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'php', 'rb', 'go', 'cs', 'cpp', 'c'];

interface InjectionPattern {
  name: string;
  pattern: RegExp;
  severity: Severity;
  description: string;
  category: 'XSS' | 'Command' | 'NoSQL' | 'LDAP' | 'PathTraversal' | 'Template' | 'SQL';
}

const INJECTION_PATTERNS: InjectionPattern[] = [
  // XSS Patterns
  {
    name: 'Unescaped User Input in innerHTML',
    pattern: /\.innerHTML\s*=\s*[^=](req\.|params\.|query\.|body\.|req\[|params\[|query\[|body\[)/gi,
    severity: 'High',
    description: 'User input is directly assigned to innerHTML without sanitization, making it vulnerable to XSS attacks.',
    category: 'XSS',
  },
  {
    name: 'dangerouslySetInnerHTML with User Input',
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*[^}]*\b(req\.|params\.|query\.|body\.|req\[|params\[|query\[|body\[)/gi,
    severity: 'High',
    description: 'React dangerouslySetInnerHTML prop uses user input without sanitization, vulnerable to XSS.',
    category: 'XSS',
  },
  {
    name: 'eval() with User Input',
    pattern: /eval\s*\(\s*[^)]*\b(req\.|params\.|query\.|body\.|req\[|params\[|query\[|body\[|process\.argv)/gi,
    severity: 'Critical',
    description: 'eval() function executes user-controlled input, allowing arbitrary code execution.',
    category: 'XSS',
  },
  {
    name: 'Function() Constructor with User Input',
    pattern: /new\s+Function\s*\(\s*[^)]*\b(req\.|params\.|query\.|body\.|req\[|params\[|query\[|body\[)/gi,
    severity: 'Critical',
    description: 'Function constructor uses user input, allowing arbitrary code execution.',
    category: 'XSS',
  },
  {
    name: 'setTimeout/setInterval with User Input',
    pattern: /(setTimeout|setInterval)\s*\(\s*[^,]*\b(req\.|params\.|query\.|body\.|req\[|params\[|query\[|body\[)/gi,
    severity: 'High',
    description: 'setTimeout or setInterval uses user input as code, vulnerable to code injection.',
    category: 'XSS',
  },
  
  // Command Injection Patterns
  {
    name: 'child_process.exec() with User Input',
    pattern: /(child_process|exec|spawn|execFile)\.(exec|spawn|execFile)\s*\(\s*[^,)]*\b(req\.|params\.|query\.|body\.|req\[|params\[|query\[|body\[|process\.argv)/gi,
    severity: 'Critical',
    description: 'Shell command execution uses user input without sanitization, vulnerable to command injection.',
    category: 'Command',
  },
  {
    name: 'Template Literal in Shell Command',
    pattern: /(exec|spawn|execFile)\s*\([`'"]\s*\$\{.*\}/gi,
    severity: 'Critical',
    description: 'Shell command uses template literals with user input, vulnerable to command injection.',
    category: 'Command',
  },
  
  // NoSQL Injection Patterns
  {
    name: 'MongoDB $where with User Input',
    pattern: /\$where\s*:\s*[^,}]*\b(req\.|params\.|query\.|body\.|req\[|params\[|query\[|body\[)/gi,
    severity: 'High',
    description: 'MongoDB $where operator uses user input, vulnerable to NoSQL injection.',
    category: 'NoSQL',
  },
  {
    name: 'MongoDB $regex with User Input',
    pattern: /\$regex\s*:\s*[^,}]*\b(req\.|params\.|query\.|body\.|req\[|params\[|query\[|body\[)/gi,
    severity: 'Medium',
    description: 'MongoDB $regex uses user input without sanitization, potentially vulnerable to ReDoS.',
    category: 'NoSQL',
  },
  {
    name: 'MongoDB Query with User Input',
    pattern: /(find|findOne|update|delete|remove)\s*\(\s*\{[^}]*\b(req\.|params\.|query\.|body\.|req\[|params\[|query\[|body\[)/gi,
    severity: 'High',
    description: 'MongoDB query directly uses user input without validation, vulnerable to NoSQL injection.',
    category: 'NoSQL',
  },
  
  // LDAP Injection Patterns
  {
    name: 'LDAP Query with User Input',
    pattern: /(ldap\.search|ldap\.find|ldap\.query)\s*\(\s*[^,)]*\b(req\.|params\.|query\.|body\.|req\[|params\[|query\[|body\[)/gi,
    severity: 'High',
    description: 'LDAP query uses user input without sanitization, vulnerable to LDAP injection.',
    category: 'LDAP',
  },
  
  // Path Traversal Patterns
  {
    name: 'File Operation with User-Controlled Path',
    pattern: /(readFile|writeFile|readFileSync|writeFileSync|open|createReadStream|createWriteStream)\s*\(\s*[^,)]*\b(req\.|params\.|query\.|body\.|req\[|params\[|query\[|body\[)/gi,
    severity: 'High',
    description: 'File operation uses user-controlled path without validation, vulnerable to path traversal.',
    category: 'PathTraversal',
  },
  {
    name: 'Path Traversal Pattern',
    pattern: /(\.\.\/|\.\.\\|\/\.\.\/|\\\.\.\\)/g,
    severity: 'Medium',
    description: 'Path traversal pattern detected in user input handling. Verify proper path validation.',
    category: 'PathTraversal',
  },
  
  // Template Injection Patterns
  {
    name: 'Template Engine with User Input',
    pattern: /(render|template|ejs|pug|handlebars|mustache)\s*\(\s*[^,)]*\b(req\.|params\.|query\.|body\.|req\[|params\[|query\[|body\[)/gi,
    severity: 'High',
    description: 'Template engine uses user input without sanitization, vulnerable to server-side template injection.',
    category: 'Template',
  },
  
  // SQL Injection (expanded from sqlInjectionScanner)
  {
    name: 'Template Literal SQL',
    pattern: /(query|execute|exec)\s*\([`'"]\s*SELECT\s+.*\$\{.*\}.*[`'"]/gis,
    severity: 'High',
    description: 'SQL query uses template literals with user input, making it vulnerable to SQL injection.',
    category: 'SQL',
  },
  {
    name: 'String Concatenation SQL',
    pattern: /(query|execute|exec)\s*\([`'"]\s*SELECT\s+.*['"]\s*\+\s*.*\+.*SELECT/gi,
    severity: 'High',
    description: 'SQL query uses string concatenation with user input, making it vulnerable to SQL injection.',
    category: 'SQL',
  },
  {
    name: 'Unparameterized Query',
    pattern: /(query|execute|exec)\s*\([`'"]\s*(SELECT|INSERT|UPDATE|DELETE).*\$\{.*\}.*[`'"]/gis,
    severity: 'High',
    description: 'SQL query directly interpolates variables without parameterization.',
    category: 'SQL',
  },
  {
    name: 'Raw SQL with Variables',
    pattern: /(raw|sql)\s*\([`'"]\s*(SELECT|INSERT|UPDATE|DELETE).*\$\{.*\}.*[`'"]/gis,
    severity: 'High',
    description: 'Raw SQL query uses variable interpolation instead of parameterized queries.',
    category: 'SQL',
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

export async function scanInjectionVulnerabilities(
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
      
      for (const pattern of INJECTION_PATTERNS) {
        const matches = Array.from(content.matchAll(pattern.pattern));
        
        for (const match of matches) {
          // Check if it's actually code (not a comment or string literal)
          const matchText = match[0];
          const matchIndex = match.index!;
          
          // Skip if it's in a comment
          const beforeMatch = content.substring(Math.max(0, matchIndex - 200), matchIndex);
          const isInComment = /\/\/.*$|\/\*[\s\S]*?\*\//m.test(beforeMatch + matchText);
          
          if (isInComment) {
            continue;
          }
          
          // Skip if it's clearly a false positive (e.g., in a test or example)
          const isTestFile = /test|spec|example|demo|sample/i.test(relativePath);
          const isInTestContext = /describe\(|it\(|test\(|expect\(/i.test(beforeMatch);
          
          if (isTestFile && isInTestContext) {
            continue;
          }
          
          const lineNumber = getLineNumber(content, matchIndex);
          
          vulnerabilities.push({
            id: `${scanId}-injection-${pattern.category.toLowerCase()}-${vulnerabilities.length + 1}`,
            scanId,
            title: `${pattern.category} Injection: ${pattern.name}`,
            description: pattern.description,
            severity: pattern.severity,
            location: `${relativePath}:${lineNumber}`,
            filePath: relativePath,
            lineNumber,
          });
        }
      }
    } catch (error) {
      // Skip files that can't be read
      continue;
    }
  }
  
  return vulnerabilities;
}

