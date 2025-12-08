import express from 'express';
import { randomUUID } from 'crypto';
import { query } from '../config/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { validateGitHubUrl, validateScanId } from '../utils/validators.js';
import { scanQueue } from '../services/scanQueue.js';
import { decryptToken } from '../utils/tokenManager.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { checkRepositoryAccess } from '../services/github.js';

const router = express.Router();

// Apply rate limiting to scan endpoints
router.use(rateLimiter);

// Start new scan
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { repositoryUrl } = req.body;
    const userId = req.userId!;

    if (!repositoryUrl) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }

    if (!validateGitHubUrl(repositoryUrl)) {
      return res.status(400).json({ error: 'Invalid GitHub URL format' });
    }

    // Get user's GitHub token
    const userResult = await query(
      'SELECT access_token_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Decrypt GitHub token
    let githubToken: string;
    try {
      githubToken = decryptToken(userResult.rows[0].access_token_hash);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to retrieve GitHub token' });
    }

    // Create scan record
    const scanId = randomUUID();
    await query(
      `INSERT INTO scans (id, user_id, repository_url, status, progress)
       VALUES ($1, $2, $3, $4, $5)`,
      [scanId, userId, repositoryUrl, 'pending', 0]
    );

    // Queue scan job
    await scanQueue.add('scan-repository', {
      repoUrl: repositoryUrl,
      userId,
      githubToken,
      scanId,
    }, {
      jobId: scanId,
    });

    res.json({ scanId });
  } catch (error) {
    console.error('Start scan error:', error);
    return res.status(500).json({ error: 'Failed to start scan' });
  }
});

// Get scan results
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;
    
    if (!validateScanId(id)) {
      return res.status(400).json({ error: 'Invalid scan ID format' });
    }

    // Get scan
    const scanResult = await query(
      `SELECT id, repository_url, status, progress, tech_stack, score, 
              started_at, completed_at, created_at
       FROM scans WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (scanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    const scan = scanResult.rows[0];

    // Get vulnerabilities
    const vulnResult = await query(
      `SELECT id, title, description, severity, location, file_path, line_number
       FROM vulnerabilities WHERE scan_id = $1
       ORDER BY 
         CASE severity
           WHEN 'Critical' THEN 1
           WHEN 'High' THEN 2
           WHEN 'Medium' THEN 3
           WHEN 'Low' THEN 4
         END`,
      [id]
    );

    res.json({
      id: scan.id,
      url: scan.repository_url,
      score: scan.score || 0,
      timestamp: scan.completed_at || scan.created_at,
      vulnerabilities: vulnResult.rows.map(v => ({
        id: v.id,
        scanId: scan.id,
        title: v.title,
        description: v.description,
        severity: v.severity,
        location: v.location,
        filePath: v.file_path,
        lineNumber: v.line_number,
      })),
      techStack: scan.tech_stack || [],
    });
  } catch (error) {
    console.error('Get scan error:', error);
    return res.status(500).json({ error: 'Failed to get scan' });
  }
});

// Get scan status
router.get('/:id/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;
    
    if (!validateScanId(id)) {
      return res.status(400).json({ error: 'Invalid scan ID format' });
    }

    const result = await query(
      'SELECT status, progress FROM scans WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    res.json({
      status: result.rows[0].status,
      progress: result.rows[0].progress,
      logs: [], // Logs are sent via WebSocket
    });
  } catch (error) {
    console.error('Get scan status error:', error);
    return res.status(500).json({ error: 'Failed to get scan status' });
  }
});

// Check repository access for AI fixes
router.post('/check-access', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { repositoryUrl } = req.body;
    const userId = req.userId!;

    if (!repositoryUrl) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }

    if (!validateGitHubUrl(repositoryUrl)) {
      return res.status(400).json({ error: 'Invalid GitHub URL format' });
    }

    // Get user's GitHub token
    const userResult = await query(
      'SELECT access_token_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Decrypt GitHub token
    let githubToken: string;
    try {
      githubToken = decryptToken(userResult.rows[0].access_token_hash);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to retrieve GitHub token' });
    }

    // Check repository access
    const accessCheck = await checkRepositoryAccess(repositoryUrl, githubToken);

    res.json({
      hasAccess: accessCheck.hasAccess,
      permission: accessCheck.permission,
      isOwner: accessCheck.isOwner,
    });
  } catch (error) {
    console.error('Check access error:', error);
    return res.status(500).json({ error: 'Failed to check repository access' });
  }
});

// List user's scans
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const result = await query(
      `SELECT id, repository_url, status, progress, score, created_at, completed_at
       FROM scans WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json(result.rows.map(scan => ({
      id: scan.id,
      url: scan.repository_url,
      status: scan.status,
      progress: scan.progress,
      score: scan.score,
      createdAt: scan.created_at,
      completedAt: scan.completed_at,
    })));
  } catch (error) {
    console.error('List scans error:', error);
    res.status(500).json({ error: 'Failed to list scans' });
  }
});

export default router;

