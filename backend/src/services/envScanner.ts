import { promises as fs } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { Vulnerability } from '../types/index.js';

const PUBLIC_DIRS = ['public', 'static', 'assets', 'www', 'dist', 'build'];

function shouldExcludePath(filePath: string, basePath: string): boolean {
  const relativePath = relative(basePath, filePath);
  const parts = relativePath.split(/[/\\]/);
  return parts.some(part => part === 'node_modules' || part === '.git');
}

async function findEnvFiles(dirPath: string, basePath: string = dirPath): Promise<string[]> {
  const envFiles: string[] = [];
  
  try {
    const entries = await readdir(dirPath);
    
    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      
      if (shouldExcludePath(fullPath, basePath)) {
        continue;
      }
      
      const stats = await stat(fullPath);
      
      if (stats.isDirectory()) {
        const subFiles = await findEnvFiles(fullPath, basePath);
        envFiles.push(...subFiles);
      } else if (entry.startsWith('.env')) {
        envFiles.push(fullPath);
      }
    }
  } catch (error) {
    // Ignore permission errors
  }
  
  return envFiles;
}

function isInPublicDirectory(filePath: string, basePath: string): boolean {
  const relativePath = relative(basePath, filePath);
  const parts = relativePath.split(/[/\\]/);
  return PUBLIC_DIRS.some(dir => parts.includes(dir));
}

async function checkForSecretsInEnv(filePath: string): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    // Check if file contains actual secrets (not just placeholders)
    const hasSecrets = /=\s*['"]?[a-zA-Z0-9\-_]{20,}['"]?/g.test(content);
    const hasPlaceholders = /example|placeholder|your[_-]|replace|change|TODO/i.test(content);
    return hasSecrets && !hasPlaceholders;
  } catch {
    return false;
  }
}

export async function scanEnvFiles(
  repoPath: string,
  scanId: string
): Promise<Vulnerability[]> {
  const vulnerabilities: Vulnerability[] = [];
  const envFiles = await findEnvFiles(repoPath);
  
  for (const file of envFiles) {
    const relativePath = relative(repoPath, file);
    const fileName = file.split(/[/\\]/).pop() || '';
    
    // Check if .env file is in public directory
    if (isInPublicDirectory(file, repoPath)) {
      vulnerabilities.push({
        id: `${scanId}-env-public-${vulnerabilities.length + 1}`,
        scanId,
        title: 'Exposed .env File in Public Directory',
        description: `Environment variables file "${fileName}" is located in a public directory and may be accessible via HTTP requests, exposing sensitive configuration.`,
        severity: 'Critical',
        location: relativePath,
        filePath: relativePath,
      });
    }
    
    // Check if .env file contains actual secrets (not .env.example)
    if (fileName === '.env' && await checkForSecretsInEnv(file)) {
      vulnerabilities.push({
        id: `${scanId}-env-committed-${vulnerabilities.length + 1}`,
        scanId,
        title: 'Committed .env File with Secrets',
        description: `A .env file containing secrets has been committed to the repository. This file should be added to .gitignore and secrets should be rotated immediately.`,
        severity: 'Critical',
        location: relativePath,
        filePath: relativePath,
      });
    }
  }
  
  return vulnerabilities;
}

