import { promises as fs } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join, relative } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Vulnerability, Severity } from '../types/index.js';

const execAsync = promisify(exec);
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next'];

interface DependencyFile {
  path: string;
  type: 'package.json' | 'requirements.txt' | 'go.mod' | 'pom.xml' | 'build.gradle' | 'Cargo.toml';
}

interface DependencyVulnerability {
  package: string;
  version: string;
  severity: Severity;
  description: string;
}

async function findDependencyFiles(repoPath: string): Promise<DependencyFile[]> {
  const files: DependencyFile[] = [];
  
  async function searchDir(dirPath: string): Promise<void> {
    try {
      const entries = await readdir(dirPath);
      
      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const relativePath = relative(repoPath, fullPath);
        const parts = relativePath.split(/[/\\]/);
        
        // Skip excluded directories
        if (parts.some(part => EXCLUDE_DIRS.includes(part))) {
          continue;
        }
        
        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
          await searchDir(fullPath);
        } else if (stats.isFile()) {
          const fileName = entry.toLowerCase();
          
          if (fileName === 'package.json') {
            files.push({ path: fullPath, type: 'package.json' });
          } else if (fileName === 'requirements.txt') {
            files.push({ path: fullPath, type: 'requirements.txt' });
          } else if (fileName === 'go.mod') {
            files.push({ path: fullPath, type: 'go.mod' });
          } else if (fileName === 'pom.xml') {
            files.push({ path: fullPath, type: 'pom.xml' });
          } else if (fileName === 'build.gradle' || fileName === 'build.gradle.kts') {
            files.push({ path: fullPath, type: 'build.gradle' });
          } else if (fileName === 'cargo.toml') {
            files.push({ path: fullPath, type: 'Cargo.toml' });
          }
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }
  
  await searchDir(repoPath);
  return files;
}

async function scanNodeDependencies(
  packageJsonPath: string,
  repoPath: string
): Promise<DependencyVulnerability[]> {
  const vulnerabilities: DependencyVulnerability[] = [];
  
  try {
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    
    const allDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies,
      ...packageJson.optionalDependencies,
    };
    
    // Check for outdated packages (using ^ or ~ without lockfile)
    const hasLockFile = await checkForLockFile(repoPath);
    
    if (!hasLockFile) {
      for (const [pkg, version] of Object.entries(allDependencies)) {
        const versionStr = version as string;
        if (versionStr.startsWith('^') || versionStr.startsWith('~')) {
          vulnerabilities.push({
            package: pkg,
            version: versionStr,
            severity: 'Medium',
            description: `Package "${pkg}" uses version range (${versionStr}) without lockfile. This can lead to unexpected updates and security vulnerabilities.`,
          });
        }
      }
    }
    
    // Try to run npm audit if package.json exists and we're in a Node.js environment
    try {
      const packageDir = relative(repoPath, packageJsonPath).split(/[/\\]/)[0] || repoPath;
      const fullPackageDir = join(repoPath, packageDir);
      
      // Check if node_modules exists (dependencies installed)
      try {
        await stat(join(fullPackageDir, 'node_modules'));
        
        // Run npm audit
        const { stdout } = await execAsync('npm audit --json', {
          cwd: fullPackageDir,
          timeout: 30000, // 30 second timeout
        });
        
        const auditResult = JSON.parse(stdout);
        
        if (auditResult.vulnerabilities) {
          for (const [pkg, vulnData] of Object.entries(auditResult.vulnerabilities)) {
            const vuln = vulnData as any;
            const severity = mapNpmSeverity(vuln.severity);
            
            vulnerabilities.push({
              package: pkg,
              version: vuln.range || 'unknown',
              severity,
              description: `Vulnerability in "${pkg}": ${vuln.title || 'Known security issue'}. ${vuln.via ? `Affected versions: ${vuln.via.map((v: any) => v.title || v).join(', ')}` : ''}`,
            });
          }
        }
      } catch {
        // node_modules doesn't exist, skip npm audit
      }
    } catch (error) {
      // npm audit failed, continue without it
      console.log('npm audit not available, skipping dependency vulnerability check');
    }
    
    // Check for known vulnerable packages manually
    const knownVulnerablePackages = [
      { name: 'lodash', version: '<4.17.21', severity: 'High' as Severity, description: 'Prototype pollution vulnerability' },
      { name: 'axios', version: '<0.21.1', severity: 'Medium' as Severity, description: 'SSRF vulnerability' },
      { name: 'jsonwebtoken', version: '<8.5.1', severity: 'High' as Severity, description: 'Algorithm confusion vulnerability' },
    ];
    
    for (const vulnPkg of knownVulnerablePackages) {
      if (allDependencies[vulnPkg.name]) {
        const installedVersion = allDependencies[vulnPkg.name] as string;
        // Simple version check (basic implementation)
        if (installedVersion.includes('^') || installedVersion.includes('~')) {
          vulnerabilities.push({
            package: vulnPkg.name,
            version: installedVersion,
            severity: vulnPkg.severity,
            description: `Known vulnerability in "${vulnPkg.name}": ${vulnPkg.description}. Verify version is patched.`,
          });
        }
      }
    }
    
  } catch (error) {
    console.error(`Error scanning Node dependencies: ${error}`);
  }
  
  return vulnerabilities;
}

async function checkForLockFile(repoPath: string): Promise<boolean> {
  try {
    const lockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
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

function mapNpmSeverity(npmSeverity: string): Severity {
  const severityMap: Record<string, Severity> = {
    'critical': 'Critical',
    'high': 'High',
    'moderate': 'Medium',
    'low': 'Low',
    'info': 'Low',
  };
  
  return severityMap[npmSeverity.toLowerCase()] || 'Medium';
}

async function scanPythonDependencies(
  requirementsPath: string
): Promise<DependencyVulnerability[]> {
  const vulnerabilities: DependencyVulnerability[] = [];
  
  try {
    const content = await fs.readFile(requirementsPath, 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      
      // Check for unpinned versions
      if (!trimmed.includes('==') && !trimmed.includes('===')) {
        const pkg = trimmed.split(/[>=<]/)[0].trim();
        vulnerabilities.push({
          package: pkg,
          version: 'unpinned',
          severity: 'Medium',
          description: `Python package "${pkg}" version is not pinned. This can lead to unexpected updates and security vulnerabilities.`,
        });
      }
    }
    
    // Note: pip-audit would require Python environment, skipping for now
  } catch (error) {
    console.error(`Error scanning Python dependencies: ${error}`);
  }
  
  return vulnerabilities;
}

export async function scanDependencyVulnerabilities(
  repoPath: string,
  scanId: string
): Promise<Vulnerability[]> {
  const vulnerabilities: Vulnerability[] = [];
  const dependencyFiles = await findDependencyFiles(repoPath);
  
  for (const depFile of dependencyFiles) {
    const relativePath = relative(repoPath, depFile.path);
    let depVulns: DependencyVulnerability[] = [];
    
    try {
      if (depFile.type === 'package.json') {
        depVulns = await scanNodeDependencies(depFile.path, repoPath);
      } else if (depFile.type === 'requirements.txt') {
        depVulns = await scanPythonDependencies(depFile.path);
      }
      // Add more dependency types as needed
      
      for (const depVuln of depVulns) {
        vulnerabilities.push({
          id: `${scanId}-dep-${vulnerabilities.length + 1}`,
          scanId,
          title: `Vulnerable Dependency: ${depVuln.package}@${depVuln.version}`,
          description: depVuln.description,
          severity: depVuln.severity,
          location: `${relativePath}`,
          filePath: relativePath,
        });
      }
    } catch (error) {
      console.error(`Error scanning dependencies in ${depFile.path}:`, error);
    }
  }
  
  return vulnerabilities;
}

