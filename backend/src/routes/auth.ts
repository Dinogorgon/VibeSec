import express from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { query } from '../config/database.js';
import { getAccessToken, getUserInfo, getUserRepositories } from '../services/github.js';
import { authenticateToken } from '../middleware/auth.js';
import { encryptToken, decryptToken } from '../utils/tokenManager.js';
import { validateGeminiApiKey } from '../utils/validators.js';

const router = express.Router();

// Generate JWT token
function generateToken(userId: string): string {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' });
}

// Helper function to ensure proper frontend redirect URL (always root path)
function getFrontendRedirect(queryParams: Record<string, string> = {}): string {
  // Remove any trailing slashes and paths, ensure we redirect to root
  const baseUrl = config.frontendUrl.replace(/\/+$/, '').split('/').slice(0, 3).join('/');
  const params = new URLSearchParams(queryParams);
  const queryString = params.toString();
  return `${baseUrl}/${queryString ? `?${queryString}` : ''}`;
}

// Initiate GitHub OAuth flow
router.get('/github', (_req, res) => {
  const state = Math.random().toString(36).substring(7);
  const scope = 'repo';
  
  const authUrl = `https://github.com/login/oauth/authorize?` +
    `client_id=${config.githubClientId}&` +
    `redirect_uri=${encodeURIComponent(config.githubCallbackUrl)}&` +
    `scope=${scope}&` +
    `state=${state}`;

  return res.redirect(authUrl);
});

// Handle GitHub OAuth callback
router.get('/github/callback', async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error) {
      return res.redirect(getFrontendRedirect({ error: String(error) }));
    }

    if (!code || typeof code !== 'string') {
      return res.redirect(getFrontendRedirect({ error: 'missing_code' }));
    }

    // Exchange code for access token
    const accessToken = await getAccessToken(code);
    
    // Get user info from GitHub
    const githubUser = await getUserInfo(accessToken);
    
    // Encrypt token for storage (can be decrypted when needed)
    const encryptedToken = encryptToken(accessToken);

    // Check if user exists
    const existingUser = await query(
      'SELECT id FROM users WHERE github_id = $1',
      [githubUser.id]
    );

    let userId: string;

    if (existingUser.rows.length > 0) {
      // Update existing user
      userId = existingUser.rows[0].id;
      await query(
        'UPDATE users SET github_username = $1, access_token_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [githubUser.login, encryptedToken, userId]
      );
    } else {
      // Create new user
      const result = await query(
        'INSERT INTO users (github_id, github_username, access_token_hash) VALUES ($1, $2, $3) RETURNING id',
        [githubUser.id, githubUser.login, encryptedToken]
      );
      userId = result.rows[0].id;
    }
    
    // Store avatar URL in a separate query (we'll fetch it fresh each time from GitHub API)

    // Generate JWT token
    const token = generateToken(userId);

    // Redirect to frontend with token (always root path)
    return res.redirect(getFrontendRedirect({ token }));
  } catch (error) {
    console.error('OAuth callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error details:', { errorMessage, errorStack });
    
    // Include more specific error information in redirect
    const errorParam = errorMessage.includes('exchange') ? 'token_exchange_failed' :
                       errorMessage.includes('user') ? 'user_info_failed' :
                       errorMessage.includes('database') ? 'database_error' :
                       'oauth_failed';
    return res.redirect(getFrontendRedirect({ error: errorParam }));
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    
    const result = await query(
      'SELECT id, github_id, github_username, access_token_hash, gemini_api_key, gemini_model, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get fresh user info from GitHub to get avatar URL
    let avatarUrl = '';
    try {
      const githubToken = decryptToken(result.rows[0].access_token_hash);
      const githubUser = await getUserInfo(githubToken);
      avatarUrl = githubUser.avatar_url;
    } catch (error) {
      console.error('Failed to fetch GitHub user info:', error);
      // Continue without avatar URL
    }

    return res.json({
      id: result.rows[0].id,
      githubId: result.rows[0].github_id,
      githubUsername: result.rows[0].github_username,
      avatarUrl: avatarUrl,
      hasGeminiKey: !!result.rows[0].gemini_api_key,
      geminiModel: result.rows[0].gemini_model || 'gemini-2.5-flash-lite',
      createdAt: result.rows[0].created_at,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ error: 'Failed to get user' });
  }
});

// Get user's GitHub repositories
router.get('/repos', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    
    const userResult = await query(
      'SELECT access_token_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const githubToken = decryptToken(userResult.rows[0].access_token_hash);
    const repos = await getUserRepositories(githubToken);

    return res.json(repos);
  } catch (error) {
    console.error('Get repos error:', error);
    return res.status(500).json({ error: 'Failed to get repositories' });
  }
});

// Save/update Gemini API key
router.post('/gemini-key', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { apiKey } = req.body;

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ error: 'API key is required' });
    }

    // Validate API key format
    if (!validateGeminiApiKey(apiKey)) {
      return res.status(400).json({ error: 'Invalid API key format' });
    }

    // Encrypt the API key
    const encryptedKey = encryptToken(apiKey.trim());

    // Update user's API key
    await query(
      'UPDATE users SET gemini_api_key = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [encryptedKey, userId]
    );

    return res.json({ message: 'API key saved successfully' });
  } catch (error) {
    console.error('Save API key error:', error);
    return res.status(500).json({ error: 'Failed to save API key' });
  }
});

// Delete Gemini API key
router.delete('/gemini-key', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;

    // Set API key to NULL
    await query(
      'UPDATE users SET gemini_api_key = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );

    return res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Delete API key error:', error);
    return res.status(500).json({ error: 'Failed to delete API key' });
  }
});

// Update Gemini model preference
router.put('/gemini-model', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { model } = req.body;

    if (!model || typeof model !== 'string') {
      return res.status(400).json({ error: 'Model name is required' });
    }

    // Validate model name (basic validation - allow common Gemini model names)
    const validModels = [
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-pro',
    ];

    if (!validModels.includes(model)) {
      return res.status(400).json({ 
        error: `Invalid model name. Valid models: ${validModels.join(', ')}` 
      });
    }

    // Update user's model preference
    await query(
      'UPDATE users SET gemini_model = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [model, userId]
    );

    return res.json({ message: 'Model preference updated successfully', model });
  } catch (error) {
    console.error('Update model preference error:', error);
    return res.status(500).json({ error: 'Failed to update model preference' });
  }
});

// Logout (client-side token removal, but endpoint for consistency)
router.post('/logout', (_req, res) => {
  return res.json({ message: 'Logged out successfully' });
});

export default router;

