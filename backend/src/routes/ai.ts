import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticateToken } from '../middleware/auth.js';
import { query } from '../config/database.js';
import { decryptToken } from '../utils/tokenManager.js';
import { Vulnerability } from '../types/index.js';
import { Octokit } from '@octokit/rest';
import { cloneRepository } from '../services/github.js';
import { createTempDirectory, cleanupTempDirectory } from '../utils/fileUtils.js';
import { promises as fs } from 'fs';
import { join } from 'path';

const router = express.Router();

interface FileChange {
  filePath: string;
  isNewFile: boolean;
  changes: Array<{
    lineNumber: number;
    type: 'added' | 'removed' | 'modified';
    content: string;
  }>;
  fullContent?: string; // For new files
}

interface FixData {
  files: FileChange[];
  summary: string;
}

// Helper function to read file content from repo
async function readFileContent(filePath: string, repoPath: string): Promise<string | null> {
  try {
    const fullPath = join(repoPath, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return content;
  } catch (error) {
    return null;
  }
}

// Helper function to get relevant files for a vulnerability
async function getRelevantFiles(vulnerability: Vulnerability, repoPath: string): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  
  // Get the file mentioned in vulnerability location
  if (vulnerability.filePath) {
    const content = await readFileContent(vulnerability.filePath, repoPath);
    if (content) {
      files.set(vulnerability.filePath, content);
    }
  }
  
  // Also try to get file from location string (might be different format)
  const locationMatch = vulnerability.location.match(/([^\s:]+\.(js|ts|jsx|tsx|py|java|php|rb|go|cs|cpp|c|json|yaml|yml|env|config|conf))/);
  if (locationMatch && locationMatch[1]) {
    const potentialFile = locationMatch[1];
    if (!files.has(potentialFile)) {
      const content = await readFileContent(potentialFile, repoPath);
      if (content) {
        files.set(potentialFile, content);
      }
    }
  }
  
  return files;
}

// Generate AI fix using user's Gemini API key with structured diff format
router.post('/generate-fix', authenticateToken, async (req, res) => {
  let tempDir: string | null = null;
  
  try {
    const userId = (req as any).userId;
    const { vulnerability, techStack, repositoryUrl } = req.body;

    if (!vulnerability || !techStack || !repositoryUrl) {
      return res.status(400).json({ error: 'Vulnerability, techStack, and repositoryUrl are required' });
    }

    // Check if we already have a fix for this vulnerability (same attempt number)
    const existingFix = await query(
      `SELECT fix_data, attempt_number FROM ai_fixes 
       WHERE vulnerability_id = $1 AND user_id = $2 
       ORDER BY attempt_number DESC LIMIT 1`,
      [vulnerability.id, userId]
    );

    // If user is requesting the same fix again, return the cached version
    if (existingFix.rows.length > 0 && req.body.useExisting !== false) {
      return res.json({
        fix: existingFix.rows[0].fix_data,
        attemptNumber: existingFix.rows[0].attempt_number,
        cached: true
      });
    }

    // Get user's encrypted Gemini API key and model preference
    const userResult = await query(
      'SELECT gemini_api_key, gemini_model, access_token_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const encryptedApiKey = userResult.rows[0].gemini_api_key;
    const userModel = userResult.rows[0].gemini_model || 'gemini-pro';
    const encryptedGithubToken = userResult.rows[0].access_token_hash;

    if (!encryptedApiKey) {
      return res.status(400).json({ error: 'Gemini API key not configured. Please add your API key in settings.' });
    }

    if (!encryptedGithubToken) {
      return res.status(400).json({ error: 'GitHub token not found. Please log in again.' });
    }

    // Decrypt tokens
    let apiKey: string;
    let githubToken: string;
    try {
      apiKey = decryptToken(encryptedApiKey);
      githubToken = decryptToken(encryptedGithubToken);
    } catch (error) {
      console.error('Failed to decrypt tokens:', error);
      return res.status(500).json({ error: 'Failed to decrypt tokens' });
    }

    // Clone repository to get codebase
    tempDir = await createTempDirectory();
    await cloneRepository(repositoryUrl, githubToken, tempDir);
    
    // Get relevant files for the vulnerability
    const relevantFiles = await getRelevantFiles(vulnerability, tempDir);
    
    // Build context for Gemini
    const fileContexts = Array.from(relevantFiles.entries())
      .map(([path, content]) => `File: ${path}\n\`\`\`\n${content}\n\`\`\``)
      .join('\n\n');

    // Initialize Gemini AI with fallback model logic
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Simplified model selection: Try user's preferred model first, then default to gemini-2.5-flash
    const modelsToTry: string[] = [];
    
    // First, try user's selected model
    if (userModel) {
      modelsToTry.push(userModel);
    }
    
    // Then default to gemini-2.5-flash (known to work)
    if (!modelsToTry.includes('gemini-2.5-flash')) {
      modelsToTry.push('gemini-2.5-flash');
    }
    
    console.log(`Models to try: ${modelsToTry.join(', ')}`);
    
    let selectedModel = modelsToTry[0];

    // Create prompt for structured diff format
    const prompt = `You are a Senior Cybersecurity Expert. A vulnerability has been detected in a ${Array.isArray(techStack) ? techStack.join(', ') : techStack} application.

Vulnerability Details:
- Title: ${vulnerability.title}
- Severity: ${vulnerability.severity}
- Description: ${vulnerability.description}
- Location: ${vulnerability.location}

Relevant Codebase Files:
${fileContexts}

Your task is to generate a fix for this vulnerability. You MUST respond with a JSON object in the following exact format:

{
  "summary": "Brief explanation of the fix (2-3 sentences)",
  "files": [
    {
      "filePath": "path/to/file.js",
      "isNewFile": false,
      "changes": [
        {
          "lineNumber": 10,
          "type": "removed",
          "content": "const apiKey = 'hardcoded-key';"
        },
        {
          "lineNumber": 10,
          "type": "added",
          "content": "const apiKey = process.env.API_KEY;"
        }
      ]
    },
    {
      "filePath": "new-security-config.js",
      "isNewFile": true,
      "fullContent": "// Complete file content here\\nconst config = {\\n  // ...\\n};"
    }
  ]
}

IMPORTANT:
- For modified files: List each line change with type "removed" or "added" and the exact line number
- For new files: Set isNewFile to true and provide fullContent with the complete file content
- Only include files that need to be changed or created
- Be precise with line numbers and content
- Use \\n for newlines in fullContent
- Return ONLY valid JSON, no markdown formatting`;

    // Generate fix with fallback model logic
    let result: any;
    let response: any;
    let fixText: string | null = null;
    let lastError: any = null;
    
    // Try each model until one works
    for (const modelToTry of modelsToTry) {
      try {
        selectedModel = modelToTry;
        const model = genAI.getGenerativeModel({ model: selectedModel });
        console.log(`Attempting to generate fix with model: ${selectedModel}`);
        
        result = await model.generateContent(prompt);
        response = await result.response;
        fixText = response.text();
        
        // If we get here, generation succeeded
        console.log(`Successfully generated fix using model: ${selectedModel}`);
        break;
      } catch (error: any) {
        console.log(`Model ${modelToTry} failed:`, error.message || error);
        lastError = error;
        
        // If it's a 404 (model not found), try next model
        if (error.status === 404 || error.message?.includes('not found') || error.message?.includes('is not found')) {
          continue; // Try next model
        }
        
        // For other errors (like API key issues), throw immediately
        throw error;
      }
    }
    
    // If all models failed, return error
    if (!fixText) {
      console.error('All Gemini models failed. Last error:', lastError);
      return res.status(400).json({ 
        error: `Gemini model not available. Please try a different model in your settings. Last attempted: ${selectedModel}` 
      });
    }
    
    // Clean up the response (remove markdown code blocks if present)
    fixText = fixText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Parse JSON response
    let fixData: FixData;
    try {
      fixData = JSON.parse(fixText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', fixText);
      // Fallback: try to extract JSON from the response
      const jsonMatch = fixText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        fixData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response from Gemini');
      }
    }

    // Determine attempt number
    const attemptNumber = existingFix.rows.length > 0 
      ? existingFix.rows[0].attempt_number + 1 
      : 1;

    // Store fix in database
    await query(
      `INSERT INTO ai_fixes (vulnerability_id, user_id, repository_url, fix_data, attempt_number)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (vulnerability_id, attempt_number) 
       DO UPDATE SET fix_data = $4, updated_at = CURRENT_TIMESTAMP`,
      [vulnerability.id, userId, repositoryUrl, JSON.stringify(fixData), attemptNumber]
    );

    res.json({
      fix: fixData,
      attemptNumber,
      cached: false
    });
  } catch (error) {
    console.error('Generate fix error:', error);
    
    // Handle Gemini API errors
    if (error instanceof Error) {
      if (error.message.includes('API_KEY_INVALID') || error.message.includes('API key')) {
        return res.status(400).json({ error: 'Invalid Gemini API key. Please update your API key in settings.' });
      }
      if (error.message.includes('404') || error.message.includes('not found')) {
        return res.status(400).json({ 
          error: `Gemini model not available with your API key. Please try a different model in your settings.` 
        });
      }
    }
    
    res.status(500).json({ error: 'Failed to generate fix. Please try again.' });
  } finally {
    // Cleanup temp directory
    if (tempDir) {
      await cleanupTempDirectory(tempDir);
    }
  }
});

// Reprompt endpoint is not needed - frontend calls generate-fix with useExisting=false
// Keeping this for backwards compatibility but it just forwards to generate-fix

// Apply fix to repository
router.post('/apply-fix', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { vulnerabilityId, attemptNumber, repositoryUrl } = req.body;

    if (!vulnerabilityId || !repositoryUrl) {
      return res.status(400).json({ error: 'Vulnerability ID and repository URL are required' });
    }

    // Get the fix data and vulnerability info
    const fixResult = await query(
      `SELECT af.fix_data, v.title as vulnerability_title, v.description as vulnerability_description, v.severity
       FROM ai_fixes af
       JOIN vulnerabilities v ON af.vulnerability_id = v.id
       WHERE af.vulnerability_id = $1 AND af.user_id = $2 
       ${attemptNumber ? 'AND af.attempt_number = $3' : 'ORDER BY af.attempt_number DESC LIMIT 1'}`,
      attemptNumber ? [vulnerabilityId, userId, attemptNumber] : [vulnerabilityId, userId]
    );

    if (fixResult.rows.length === 0) {
      return res.status(404).json({ error: 'Fix not found' });
    }

    const fixData: FixData = fixResult.rows[0].fix_data;
    const vulnerabilityTitle = fixResult.rows[0].vulnerability_title;
    const vulnerabilityDescription = fixResult.rows[0].vulnerability_description;
    const vulnerabilitySeverity = fixResult.rows[0].severity;

    // Get user's GitHub token
    const userResult = await query(
      'SELECT access_token_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const encryptedGithubToken = userResult.rows[0].access_token_hash;
    const githubToken = decryptToken(encryptedGithubToken);

    // Parse repository URL
    const match = repositoryUrl.match(/github\.com[/:]([^\/]+)\/([^\/]+?)(?:\.git)?\/?$/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid GitHub URL' });
    }

    const [, owner, repo] = match;
    const octokit = new Octokit({ auth: githubToken });

    // Create a new branch for the fix
    const branchName = `vibesec-fix-${vulnerabilityId.substring(0, 8)}-${Date.now()}`;
    
    // Get default branch
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch;
    
    // Get latest commit SHA
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`
    });
    const baseSha = refData.object.sha;

    // Create new branch
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: baseSha
    });

    // Apply file changes
    for (const fileChange of fixData.files) {
      if (fileChange.isNewFile) {
        // Create new file
        await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: fileChange.filePath,
          message: `Fix: ${vulnerabilityTitle} - Add ${fileChange.filePath}`,
          content: Buffer.from(fileChange.fullContent || '').toString('base64'),
          branch: branchName
        });
      } else {
        // Get current file content
        let currentContent = '';
        let currentSha = '';
        
        try {
          const { data: fileData } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: fileChange.filePath,
            ref: branchName
          });
          
          if ('content' in fileData && fileData.encoding === 'base64') {
            currentContent = Buffer.from(fileData.content, 'base64').toString('utf-8');
            currentSha = fileData.sha;
          }
        } catch (error) {
          // File doesn't exist, treat as new file
          if (fileChange.changes.some(c => c.type === 'added')) {
            // Build new file from added lines
            const newContent = fileChange.changes
              .filter(c => c.type === 'added')
              .map(c => c.content)
              .join('\n');
            
            await octokit.rest.repos.createOrUpdateFileContents({
              owner,
              repo,
              path: fileChange.filePath,
              message: `Fix: ${vulnerabilityTitle} - Add ${fileChange.filePath}`,
              content: Buffer.from(newContent).toString('base64'),
              branch: branchName
            });
            continue;
          }
        }

        // Apply changes to existing file
        const lines = currentContent.split('\n');
        const changes = fileChange.changes.sort((a, b) => b.lineNumber - a.lineNumber); // Process from bottom to top
        
        for (const change of changes) {
          if (change.type === 'removed') {
            lines.splice(change.lineNumber - 1, 1);
          } else if (change.type === 'added') {
            lines.splice(change.lineNumber - 1, 0, change.content);
          } else if (change.type === 'modified') {
            lines[change.lineNumber - 1] = change.content;
          }
        }

        const newContent = lines.join('\n');

        await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: fileChange.filePath,
          message: `Fix: ${vulnerabilityTitle} - Update ${fileChange.filePath}`,
          content: Buffer.from(newContent).toString('base64'),
          branch: branchName,
          sha: currentSha
        });
      }
    }

    // Create concise, error-focused PR title
    // Extract key error type from vulnerability title (e.g., "Hardcoded API Key" -> "Fix: Hardcoded API Key")
    const errorType = vulnerabilityTitle.split(':')[0].trim();
    const prTitle = `Fix: ${errorType}`;
    
    // Build comprehensive PR description
    const filesChanged = fixData.files.map(f => f.filePath).join(', ');
    const prDescription = `## 🔒 Security Fix: ${vulnerabilityTitle}

**Severity:** ${vulnerabilitySeverity}

### Issue Description
${vulnerabilityDescription}

### Changes Made
${fixData.summary || 'AI-generated security fix applied to address the vulnerability.'}

### Files Modified
${fixData.files.map(f => `- \`${f.filePath}\` ${f.isNewFile ? '(new file)' : '(modified)'}`).join('\n')}

### Next Steps
Please review the changes and merge this pull request to apply the security fix to your codebase.

---
*This fix was automatically generated by VibeSec security scanner.*`;

    // Create pull request
    const { data: prData } = await octokit.rest.pulls.create({
      owner,
      repo,
      title: prTitle,
      head: branchName,
      base: defaultBranch,
      body: prDescription,
    });

    res.json({
      success: true,
      branchName,
      branchUrl: `https://github.com/${owner}/${repo}/tree/${branchName}`,
      prUrl: prData.html_url,
      prNumber: prData.number,
      message: 'Fix applied successfully. A pull request has been created with the changes.'
    });
  } catch (error) {
    console.error('Apply fix error:', error);
    res.status(500).json({ error: 'Failed to apply fix. Please try again.' });
  }
});

export default router;
