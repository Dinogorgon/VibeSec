import { detectTechStack } from './stackDetector.js';
import { scanForSecrets } from './secretScanner.js';
import { scanInjectionVulnerabilities } from './injectionScanner.js';
import { scanEnvFiles } from './envScanner.js';
import { scanSSRFVulnerabilities } from './ssrfScanner.js';
import { scanAccessControlVulnerabilities } from './accessControlScanner.js';
import { scanDependencyVulnerabilities } from './dependencyScanner.js';
import { scanCryptoVulnerabilities } from './cryptoScanner.js';
import { scanAuthVulnerabilities } from './authScanner.js';
import { scanMisconfigurationVulnerabilities } from './misconfigurationScanner.js';
import { scanIntegrityVulnerabilities } from './integrityScanner.js';
import { scanLoggingVulnerabilities } from './loggingScanner.js';
import { scanDesignVulnerabilities } from './designScanner.js';
import { calculateSecurityScore } from './vulnerabilityAnalyzer.js';
import { cloneRepository } from './github.js';
import { createTempDirectory, cleanupTempDirectory } from '../utils/fileUtils.js';
import { Vulnerability, ScanResult } from '../types/index.js';
import { query } from '../config/database.js';
import { WebSocket } from 'ws';

interface ScanProgress {
  message: string;
  progress: number;
  status: 'active' | 'complete';
}

export async function scanRepository(
  repoUrl: string,
  userId: string,
  githubToken: string,
  scanId: string,
  wsClients: Map<string, WebSocket>
): Promise<ScanResult> {
  let tempDir: string | null = null;
  
  const emitProgress = (progress: ScanProgress) => {
    const client = wsClients.get(scanId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'log',
        ...progress,
      }));
    }
    
    // Also update database
    query(
      'UPDATE scans SET progress = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [progress.progress, scanId]
    ).catch(console.error);
  };

  try {
    // Update scan status
    await query(
      'UPDATE scans SET status = $1, started_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['scanning', scanId]
    );

    // Step 1: Clone repository
    emitProgress({ message: `Connecting to ${repoUrl}...`, progress: 10, status: 'active' });
    tempDir = await createTempDirectory();
    await cloneRepository(repoUrl, githubToken, tempDir);
    emitProgress({ message: `Connecting to ${repoUrl}...`, progress: 15, status: 'complete' });

    // Step 2: Detect tech stack
    emitProgress({ message: 'Detecting Tech Stack...', progress: 20, status: 'active' });
    const techStack = await detectTechStack(tempDir);
    const techStackString = techStack.join(', ');
    emitProgress({ message: `Detecting Tech Stack: ${techStackString} detected`, progress: 30, status: 'complete' });
    
    await query(
      'UPDATE scans SET tech_stack = $1 WHERE id = $2',
      [techStack, scanId]
    );

    // Step 3: Analyze dependency tree (A06: Vulnerable Components)
    emitProgress({ message: 'Analyzing dependency tree for vulnerabilities...', progress: 35, status: 'active' });
    const dependencyVulnerabilities = await scanDependencyVulnerabilities(tempDir, scanId);
    emitProgress({ message: 'Analyzing dependency tree for vulnerabilities...', progress: 40, status: 'complete' });

    // Step 4: Scan for exposed .env files (A05: Security Misconfiguration)
    emitProgress({ message: 'Crawling for exposed .env variables...', progress: 42, status: 'active' });
    const envVulnerabilities = await scanEnvFiles(tempDir, scanId);
    emitProgress({ message: 'Crawling for exposed .env variables...', progress: 45, status: 'complete' });

    // Step 5: Scan for secrets (A02: Cryptographic Failures)
    emitProgress({ message: 'Scanning for hardcoded secrets...', progress: 47, status: 'active' });
    const secretVulnerabilities = await scanForSecrets(tempDir, scanId);
    emitProgress({ message: 'Scanning for hardcoded secrets...', progress: 50, status: 'complete' });

    // Step 6: Check cryptographic failures (A02)
    emitProgress({ message: 'Checking cryptographic implementations...', progress: 52, status: 'active' });
    const cryptoVulnerabilities = await scanCryptoVulnerabilities(tempDir, scanId);
    emitProgress({ message: 'Checking cryptographic implementations...', progress: 55, status: 'complete' });

    // Step 7: Check injection vulnerabilities (A03)
    emitProgress({ message: 'Scanning for injection vulnerabilities (SQL, XSS, Command, NoSQL)...', progress: 57, status: 'active' });
    const injectionVulnerabilities = await scanInjectionVulnerabilities(tempDir, scanId, techStack);
    emitProgress({ message: 'Scanning for injection vulnerabilities (SQL, XSS, Command, NoSQL)...', progress: 60, status: 'complete' });

    // Step 8: Check broken access control (A01)
    emitProgress({ message: 'Checking access control and authorization...', progress: 62, status: 'active' });
    const accessControlVulnerabilities = await scanAccessControlVulnerabilities(tempDir, scanId);
    emitProgress({ message: 'Checking access control and authorization...', progress: 65, status: 'complete' });

    // Step 9: Check insecure design (A04)
    emitProgress({ message: 'Analyzing design patterns and security architecture...', progress: 67, status: 'active' });
    const designVulnerabilities = await scanDesignVulnerabilities(tempDir, scanId);
    emitProgress({ message: 'Analyzing design patterns and security architecture...', progress: 70, status: 'complete' });

    // Step 10: Check security misconfiguration (A05)
    emitProgress({ message: 'Checking security misconfigurations (CORS, headers, defaults)...', progress: 72, status: 'active' });
    const misconfigVulnerabilities = await scanMisconfigurationVulnerabilities(tempDir, scanId);
    emitProgress({ message: 'Checking security misconfigurations (CORS, headers, defaults)...', progress: 75, status: 'complete' });

    // Step 11: Check authentication failures (A07)
    emitProgress({ message: 'Testing authentication and session management...', progress: 77, status: 'active' });
    const authVulnerabilities = await scanAuthVulnerabilities(tempDir, scanId);
    emitProgress({ message: 'Testing authentication and session management...', progress: 80, status: 'complete' });

    // Step 12: Check software integrity failures (A08)
    emitProgress({ message: 'Checking software and data integrity...', progress: 82, status: 'active' });
    const integrityVulnerabilities = await scanIntegrityVulnerabilities(tempDir, scanId);
    emitProgress({ message: 'Checking software and data integrity...', progress: 85, status: 'complete' });

    // Step 13: Check logging and monitoring failures (A09)
    emitProgress({ message: 'Analyzing security logging and monitoring...', progress: 87, status: 'active' });
    const loggingVulnerabilities = await scanLoggingVulnerabilities(tempDir, scanId);
    emitProgress({ message: 'Analyzing security logging and monitoring...', progress: 90, status: 'complete' });

    // Step 14: Check SSRF vulnerabilities (A10)
    emitProgress({ message: 'Scanning for SSRF vulnerabilities...', progress: 92, status: 'active' });
    const ssrfVulnerabilities = await scanSSRFVulnerabilities(tempDir, scanId);
    emitProgress({ message: 'Scanning for SSRF vulnerabilities...', progress: 95, status: 'complete' });

    // Step 9: Finalize security report
    emitProgress({ message: 'Finalizing security report...', progress: 98, status: 'active' });
    
    // Combine all vulnerabilities from OWASP Top 10 scanners
    const allVulnerabilities: Vulnerability[] = [
      // A01: Broken Access Control
      ...accessControlVulnerabilities,
      // A02: Cryptographic Failures
      ...secretVulnerabilities,
      ...cryptoVulnerabilities,
      // A03: Injection
      ...injectionVulnerabilities,
      // A04: Insecure Design
      ...designVulnerabilities,
      // A05: Security Misconfiguration
      ...envVulnerabilities,
      ...misconfigVulnerabilities,
      // A06: Vulnerable Components
      ...dependencyVulnerabilities,
      // A07: Authentication Failures
      ...authVulnerabilities,
      // A08: Software Integrity Failures
      ...integrityVulnerabilities,
      // A09: Logging and Monitoring Failures
      ...loggingVulnerabilities,
      // A10: SSRF
      ...ssrfVulnerabilities,
    ];

    // Calculate security score
    const score = calculateSecurityScore(allVulnerabilities);

    // Store vulnerabilities in database and get their database UUIDs
    const vulnerabilitiesWithIds: Vulnerability[] = [];
    for (const vuln of allVulnerabilities) {
      const result = await query(
        `INSERT INTO vulnerabilities (scan_id, title, description, severity, location, file_path, line_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          scanId,
          vuln.title,
          vuln.description,
          vuln.severity,
          vuln.location,
          vuln.filePath || null,
          vuln.lineNumber || null,
        ]
      );
      
      // Replace temporary ID with database UUID
      vulnerabilitiesWithIds.push({
        ...vuln,
        id: result.rows[0].id, // Use the actual database UUID
      });
    }

    // Update scan with final results
    await query(
      `UPDATE scans 
       SET status = $1, score = $2, progress = 100, completed_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      ['completed', score, scanId]
    );

    emitProgress({ message: 'Finalizing security report...', progress: 100, status: 'complete' });

    // Build result object with correct database UUIDs
    const result: ScanResult = {
      id: scanId,
      url: repoUrl,
      score,
      timestamp: new Date().toISOString(),
      vulnerabilities: vulnerabilitiesWithIds, // Use vulnerabilities with database UUIDs
      techStack,
    };

    // Send completion event
    const client = wsClients.get(scanId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'complete',
        result,
      }));
    }

    return result;
  } catch (error) {
    console.error('Scan error:', error);
    
    // Update scan status to failed
    await query(
      'UPDATE scans SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['failed', scanId]
    );

    // Send error event
    const client = wsClients.get(scanId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : 'Scan failed',
      }));
    }

    throw error;
  } finally {
    // Cleanup temp directory
    if (tempDir) {
      await cleanupTempDirectory(tempDir);
    }
  }
}

