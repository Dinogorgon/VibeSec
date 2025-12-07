import { promises as fs } from 'fs';
import { join } from 'path';
import { existsSync } from 'fs';

export async function detectTechStack(repoPath: string): Promise<string[]> {
  const stack: string[] = [];
  const files = await fs.readdir(repoPath);

  // Check for package.json (Node.js)
  if (files.includes('package.json')) {
    stack.push('Node.js');
    try {
      const pkgContent = await fs.readFile(join(repoPath, 'package.json'), 'utf-8');
      const pkg = JSON.parse(pkgContent);
      
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      if (deps.next || deps['next.js']) {
        stack.push('Next.js');
      }
      if (deps.react) {
        stack.push('React');
      }
      if (deps['@supabase/supabase-js'] || deps['@supabase/auth-helpers-nextjs']) {
        stack.push('Supabase');
      }
      if (deps.firebase || deps['firebase-admin']) {
        stack.push('Firebase');
      }
      if (deps.vercel) {
        stack.push('Vercel');
      }
      if (deps.pg || deps['pg-native'] || deps.postgres) {
        stack.push('PostgreSQL');
      }
      if (deps.mongodb || deps.mongoose) {
        stack.push('MongoDB');
      }
      if (deps.prisma) {
        stack.push('Prisma');
      }
      if (deps.sequelize) {
        stack.push('Sequelize');
      }
    } catch (error) {
      console.error('Error reading package.json:', error);
    }
  }

  // Check for requirements.txt (Python)
  if (files.includes('requirements.txt')) {
    stack.push('Python');
  }

  // Check for go.mod (Go)
  if (files.includes('go.mod')) {
    stack.push('Go');
  }

  // Check for Cargo.toml (Rust)
  if (files.includes('Cargo.toml')) {
    stack.push('Rust');
  }

  // Check for pom.xml (Java/Maven)
  if (files.includes('pom.xml')) {
    stack.push('Java');
  }

  // Check for composer.json (PHP)
  if (files.includes('composer.json')) {
    stack.push('PHP');
  }

  // Check for Gemfile (Ruby)
  if (files.includes('Gemfile')) {
    stack.push('Ruby');
  }

  // Check for Supabase directory
  if (files.includes('supabase') || existsSync(join(repoPath, 'supabase'))) {
    if (!stack.includes('Supabase')) {
      stack.push('Supabase');
    }
  }

  // Check for Tailwind CSS
  if (files.includes('tailwind.config.js') || files.includes('tailwind.config.ts')) {
    stack.push('Tailwind CSS');
  }

  // Check for TypeScript
  if (files.includes('tsconfig.json')) {
    stack.push('TypeScript');
  }

  return stack;
}

