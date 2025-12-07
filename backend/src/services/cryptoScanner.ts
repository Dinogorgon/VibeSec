import { promises as fs } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { Vulnerability, Severity } from '../types/index.js';

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next'];
const CODE_FILE_EXTENSIONS = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'php', 'rb', 'go', 'cs'];

interface CryptoPattern {
  name: string;
  pattern: RegExp;
  severity: Severity;
  description: string;
}

const CRYPTO_PATTERNS: CryptoPattern[] = [
  {
    name: 'Weak Hashing Algorithm (MD5)',
    pattern: /(crypto\.createHash|hashlib\.|DigestUtils\.|MessageDigest\.getInstance)\s*\(\s*['"](md5|MD5)['"]/gi,
    severity: 'High',
    description: 'MD5 hashing algorithm is cryptographically broken and should not be used for security purposes.',
  },
  {
    name: 'Weak Hashing Algorithm (SHA1)',
    pattern: /(crypto\.createHash|hashlib\.|DigestUtils\.|MessageDigest\.getInstance)\s*\(\s*['"](sha1|SHA1)['"]/gi,
    severity: 'High',
    description: 'SHA1 hashing algorithm is deprecated and vulnerable to collision attacks. Use SHA-256 or better.',
  },
  {
    name: 'Weak Encryption (DES)',
    pattern: /(crypto\.createCipher|Cipher\.getInstance)\s*\(\s*['"]des['"]/gi,
    severity: 'Critical',
    description: 'DES encryption algorithm is weak and should not be used. Use AES-256 or better.',
  },
  {
    name: 'Weak Encryption (RC4)',
    pattern: /(crypto\.createCipher|Cipher\.getInstance)\s*\(\s*['"]rc4['"]/gi,
    severity: 'Critical',
    description: 'RC4 encryption algorithm is weak and should not be used. Use AES-256 or better.',
  },
  {
    name: 'Hardcoded Encryption Key',
    pattern: /(secret|key|password|token)\s*[=:]\s*['"]([a-zA-Z0-9]{16,})['"]/gi,
    severity: 'Critical',
    description: 'Encryption key or secret is hardcoded in the source code. Move to environment variables.',
  },
  {
    name: 'bcrypt with Low Rounds',
    pattern: /bcrypt\.(hash|hashSync|genSalt|genSaltSync)\s*\([^,)]*,\s*([0-9]+)/gi,
    severity: 'Medium',
    description: 'bcrypt with low rounds (< 10) is vulnerable to brute force attacks. Use at least 10 rounds.',
  },
  {
    name: 'Insecure Random Number Generation',
    pattern: /Math\.random\s*\(\s*\)/g,
    severity: 'Medium',
    description: 'Math.random() is not cryptographically secure. Use crypto.randomBytes() or crypto.getRandomValues() for security purposes.',
  },
  {
    name: 'HTTP URL in Production',
    pattern: /(https?:\/\/[^\s'"]*http:\/\/|['"]http:\/\/[^'"]*)/gi,
    severity: 'High',
    description: 'HTTP URLs detected. Use HTTPS in production to prevent man-in-the-middle attacks.',
  },
  {
    name: 'Weak Password Validation',
    pattern: /(password|passwd).*\.(length|len)\s*[<>=]\s*([0-7]|8\s*[<>=])/gi,
    severity: 'Medium',
    description: 'Password validation allows weak passwords (< 8 characters). Enforce stronger password policies.',
  },
  {
    name: 'Missing Password Complexity',
    pattern: /password.*validation|validate.*password/gi,
    severity: 'Low',
    description: 'Password validation detected. Verify it enforces complexity requirements (uppercase, lowercase, numbers, special characters).',
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

function isFalsePositive(content: string, matchIndex: number, pattern: CryptoPattern): boolean {
  const beforeMatch = content.substring(Math.max(0, matchIndex - 200), matchIndex);
  const afterMatch = content.substring(matchIndex, Math.min(content.length, matchIndex + 200));
  const context = beforeMatch + afterMatch;
  
  // Check for comments
  if (/\/\/.*$|\/\*[\s\S]*?\*\//m.test(beforeMatch)) {
    return true;
  }
  
  // Check for test files
  if (/test|spec|example|demo|sample/i.test(context)) {
    return true;
  }
  
  // For bcrypt low rounds, check if it's actually low
  if (pattern.name.includes('bcrypt')) {
    const roundsMatch = context.match(/,\s*([0-9]+)/);
    if (roundsMatch && parseInt(roundsMatch[1]) >= 10) {
      return true;
    }
  }
  
  // For Math.random(), check if it's used for non-security purposes
  if (pattern.name.includes('Math.random')) {
    const nonSecurityContext = /(color|style|animation|random|shuffle|sample|pick)/i.test(context);
    if (nonSecurityContext) {
      return true;
    }
  }
  
  // For HTTP URLs, check if it's in comments or documentation
  if (pattern.name.includes('HTTP')) {
    if (/example|documentation|comment|note|TODO/i.test(context)) {
      return true;
    }
  }
  
  return false;
}

export async function scanCryptoVulnerabilities(
  repoPath: string,
  scanId: string
): Promise<Vulnerability[]> {
  const vulnerabilities: Vulnerability[] = [];
  const files = await getAllCodeFiles(repoPath);
  
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      const relativePath = relative(repoPath, file);
      
      for (const pattern of CRYPTO_PATTERNS) {
        const matches = Array.from(content.matchAll(pattern.pattern));
        
        for (const match of matches) {
          const matchIndex = match.index!;
          
          if (isFalsePositive(content, matchIndex, pattern)) {
            continue;
          }
          
          const lineNumber = getLineNumber(content, matchIndex);
          
          vulnerabilities.push({
            id: `${scanId}-crypto-${vulnerabilities.length + 1}`,
            scanId,
            title: `Cryptographic Failure: ${pattern.name}`,
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

