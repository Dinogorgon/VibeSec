import { Octokit } from '@octokit/rest';
import { simpleGit, SimpleGit } from 'simple-git';
import { promises as fs } from 'fs';
import { join } from 'path';
import { config } from '../config/env.js';

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

export async function getAccessToken(code: string): Promise<string> {
  if (!config.githubClientId || !config.githubClientSecret) {
    throw new Error('GitHub OAuth credentials are not configured');
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: config.githubClientId,
      client_secret: config.githubClientSecret,
      code,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('GitHub token exchange failed:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
    });
    throw new Error(`Failed to exchange code for access token: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    console.error('GitHub OAuth error response:', data);
    throw new Error(data.error_description || data.error);
  }

  if (!data.access_token) {
    throw new Error('No access token received from GitHub');
  }

  return data.access_token;
}

export async function getUserInfo(token: string): Promise<GitHubUser> {
  if (!token) {
    throw new Error('GitHub token is required');
  }

  try {
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.rest.users.getAuthenticated();
    
    if (!data.id || !data.login) {
      throw new Error('Invalid user data received from GitHub');
    }
    
    return {
      id: data.id,
      login: data.login,
      name: data.name || null,
      email: data.email || null,
      avatar_url: data.avatar_url || '',
    };
  } catch (error) {
    console.error('Failed to get GitHub user info:', error);
    if (error instanceof Error) {
      throw new Error(`GitHub API error: ${error.message}`);
    }
    throw error;
  }
}

export async function getUserRepositories(token: string): Promise<Array<{ name: string; full_name: string; html_url: string; private: boolean }>> {
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 100,
  });
  
  return data.map(repo => ({
    name: repo.name,
    full_name: repo.full_name,
    html_url: repo.html_url,
    private: repo.private,
  }));
}

export async function cloneRepository(
  repoUrl: string,
  token: string,
  outputDir: string
): Promise<string> {
  // Parse GitHub URL
  const match = repoUrl.match(/github\.com[/:]([^\/]+)\/([^\/]+?)(?:\.git)?\/?$/);
  if (!match) {
    throw new Error('Invalid GitHub URL');
  }

  const [, owner, repo] = match;
  
  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });

  // Clone using git with token authentication
  const git: SimpleGit = simpleGit();
  const cloneUrl = `https://${token}@github.com/${owner}/${repo}.git`;
  
  try {
    await git.clone(cloneUrl, outputDir, ['--depth', '1']);
    return outputDir;
  } catch (error) {
    // Cleanup on failure
    try {
      await fs.rm(outputDir, { recursive: true, force: true });
    } catch {}
    throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getRepositoryFiles(
  repoUrl: string,
  token: string
): Promise<string[]> {
  const match = repoUrl.match(/github\.com[/:]([^\/]+)\/([^\/]+?)(?:\.git)?\/?$/);
  if (!match) {
    throw new Error('Invalid GitHub URL');
  }

  const [, owner, repo] = match;
  const octokit = new Octokit({ auth: token });
  
  const files: string[] = [];
  
  async function traversePath(path: string = '') {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.type === 'file') {
          files.push(item.path);
        } else if (item.type === 'dir') {
          await traversePath(item.path);
        }
      }
    }
  }

  await traversePath();
  return files;
}

export async function checkRepositoryAccess(
  repoUrl: string,
  token: string
): Promise<{ hasAccess: boolean; permission?: string; isOwner?: boolean }> {
  try {
    const match = repoUrl.match(/github\.com[/:]([^\/]+)\/([^\/]+?)(?:\.git)?\/?$/);
    if (!match) {
      console.log('Invalid GitHub URL format:', repoUrl);
      return { hasAccess: false };
    }

    const [, owner, repo] = match;
    const repoFullName = `${owner}/${repo}`;
    const octokit = new Octokit({ auth: token });
    
    // Get authenticated user first
    let userData;
    try {
      const userResponse = await octokit.rest.users.getAuthenticated();
      userData = userResponse.data;
      console.log(`Checking access for user: ${userData.login} on ${repoFullName}`);
    } catch (error) {
      console.error('Failed to get authenticated user:', error);
      return { hasAccess: false };
    }
    
    // Get all repositories the user has access to (this includes permissions)
    // This is more reliable than checking individual repo permissions
    try {
      const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100, // Get first 100 repos (should cover most cases)
        type: 'all', // Include all repos (owned, member, etc.)
      });
      
      // Find the repo in the user's accessible repos
      const matchingRepo = repos.find(r => {
        const repoName = r.full_name.toLowerCase();
        const repoUrlLower = repoFullName.toLowerCase();
        return repoName === repoUrlLower;
      });
      
      if (matchingRepo) {
        // Check permissions from the repo list (GitHub includes this)
        const permissions = (matchingRepo as any).permissions;
        const isOwner = matchingRepo.owner.login.toLowerCase() === userData.login.toLowerCase();
        
        console.log(`Found repo ${repoFullName} in user's accessible repos. Owner: ${isOwner}, Permissions:`, permissions);
        
        // If user is owner, always allow
        if (isOwner) {
          console.log(`User ${userData.login} is owner of ${repoFullName}`);
          return {
            hasAccess: true,
            permission: 'owner',
            isOwner: true,
          };
        }
        
        // Check if user has write/admin permissions
        if (permissions && (permissions.admin || permissions.push)) {
          console.log(`User ${userData.login} has ${permissions.admin ? 'admin' : 'write'} permission on ${repoFullName}`);
          return {
            hasAccess: true,
            permission: permissions.admin ? 'admin' : 'write',
            isOwner: false,
          };
        } else {
          console.log(`User ${userData.login} has read-only permission on ${repoFullName}`);
          return {
            hasAccess: false,
            permission: permissions?.pull ? 'read' : 'none',
            isOwner: false,
          };
        }
      } else {
        // Repo not found in user's accessible repos
        // This could mean:
        // 1. User doesn't have access
        // 2. Repo is beyond the first 100 repos (pagination)
        // Let's try pagination to be thorough
        
        console.log(`Repo ${repoFullName} not found in first 100 repos, checking pagination...`);
        
        // Try to get more repos if needed (up to 300 total)
        let allRepos = [...repos];
        let page = 2;
        while (allRepos.length < 300 && repos.length === 100) {
          try {
            const { data: moreRepos } = await octokit.rest.repos.listForAuthenticatedUser({
              sort: 'updated',
              per_page: 100,
              page,
              type: 'all',
            });
            
            if (moreRepos.length === 0) break;
            
            allRepos = [...allRepos, ...moreRepos];
            
            const found = moreRepos.find(r => r.full_name.toLowerCase() === repoFullName.toLowerCase());
            if (found) {
              const permissions = (found as any).permissions;
              const isOwner = found.owner.login.toLowerCase() === userData.login.toLowerCase();
              
              if (isOwner || (permissions && (permissions.admin || permissions.push))) {
                console.log(`Found repo ${repoFullName} in page ${page}`);
                return {
                  hasAccess: true,
                  permission: isOwner ? 'owner' : (permissions.admin ? 'admin' : 'write'),
                  isOwner,
                };
              }
            }
            
            page++;
            if (moreRepos.length < 100) break; // Last page
          } catch (pageError) {
            console.log(`Error fetching page ${page}:`, pageError);
            break;
          }
        }
        
        // If still not found, user likely doesn't have access
        console.log(`Repo ${repoFullName} not found in user's accessible repositories`);
        return { hasAccess: false };
      }
    } catch (error: any) {
      console.error('Failed to list user repositories:', error);
      // Fallback to old method if listing fails
      console.log('Falling back to direct repo check...');
      
      try {
        const response = await octokit.rest.repos.get({
          owner,
          repo,
        });
        const repoData = response.data;
        const isOwner = repoData.owner.login.toLowerCase() === userData.login.toLowerCase();
        
        if (isOwner) {
          return {
            hasAccess: true,
            permission: 'owner',
            isOwner: true,
          };
        }
        
        // Check permissions if available
        if ((repoData as any).permissions) {
          const permissions = (repoData as any).permissions;
          if (permissions.admin || permissions.push) {
            return {
              hasAccess: true,
              permission: permissions.admin ? 'admin' : 'write',
              isOwner: false,
            };
          }
        }
      } catch (fallbackError: any) {
        console.error('Fallback check also failed:', fallbackError);
      }
      
      return { hasAccess: false };
    }
  } catch (error) {
    console.error('Failed to check repository access:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack);
    }
    return { hasAccess: false };
  }
}

