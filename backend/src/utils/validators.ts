export function validateGitHubUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  const githubUrlPattern = /^https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\/[a-zA-Z0-9._-]+(?:\/)?$/;
  return githubUrlPattern.test(url.trim());
}

export function sanitizeFilePath(filePath: string): string {
  if (!filePath || typeof filePath !== 'string') {
    return '';
  }
  // Remove any path traversal attempts and dangerous characters
  return filePath
    .replace(/\.\./g, '')
    .replace(/[<>:"|?*]/g, '')
    .replace(/^\/+/, '') // Remove leading slashes
    .trim();
}

export function validateScanId(id: string): boolean {
  // UUID v4 validation
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(id);
}

export function validateGeminiApiKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }
  
  const trimmedKey = key.trim();
  
  // Basic validation: non-empty, reasonable length (Gemini API keys are typically 39+ characters)
  if (trimmedKey.length < 20 || trimmedKey.length > 200) {
    return false;
  }
  
  // Gemini API keys typically contain alphanumeric characters and may include dashes/underscores
  // This is a basic format check - actual validation happens when using the key
  const validPattern = /^[A-Za-z0-9_-]+$/;
  return validPattern.test(trimmedKey);
}

