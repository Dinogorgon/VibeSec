import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

export async function createTempDirectory(): Promise<string> {
  const tempDir = join(tmpdir(), 'vibesec', randomUUID());
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

export async function cleanupTempDirectory(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    console.error(`Failed to cleanup temp directory ${dirPath}:`, error);
  }
}

