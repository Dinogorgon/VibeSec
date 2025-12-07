import { BookOpen, Shield, Key, Database, Lock, AlertTriangle, Code, Globe, Server, FileText, ExternalLink } from 'lucide-react';

export default function DocsView({ onBack }: { onBack: () => void }) {
  const owaspCategories = [
    {
      id: 'A01',
      title: 'Broken Access Control',
      icon: Lock,
      description: 'Checks for missing authorization checks, insecure direct object references (IDOR), and privilege escalation vulnerabilities.',
      checks: [
        'Missing authorization checks on API endpoints',
        'Insecure direct object references (IDOR)',
        'Missing access control on sensitive routes',
        'Privilege escalation vulnerabilities',
        'Insecure file access patterns'
      ]
    },
    {
      id: 'A02',
      title: 'Cryptographic Failures',
      icon: Key,
      description: 'Scans for hardcoded secrets, weak encryption, and improper cryptographic implementations.',
      checks: [
        'Hardcoded API keys and secrets',
        'Exposed credentials in code',
        'Weak encryption algorithms',
        'Improper password hashing',
        'Missing encryption for sensitive data'
      ]
    },
    {
      id: 'A03',
      title: 'Injection',
      icon: Code,
      description: 'Detects SQL injection, XSS, command injection, NoSQL injection, and other injection vulnerabilities.',
      checks: [
        'SQL injection vulnerabilities',
        'Cross-site scripting (XSS)',
        'Command injection',
        'NoSQL injection',
        'LDAP injection',
        'Path traversal',
        'Template injection'
      ]
    },
    {
      id: 'A04',
      title: 'Insecure Design',
      icon: Shield,
      description: 'Identifies insecure design patterns and architectural security flaws.',
      checks: [
        'Missing security controls in design',
        'Insecure default configurations',
        'Missing input validation',
        'Insecure error handling patterns',
        'Missing rate limiting'
      ]
    },
    {
      id: 'A05',
      title: 'Security Misconfiguration',
      icon: Server,
      description: 'Finds exposed configuration files, insecure default settings, and misconfigured security headers.',
      checks: [
        'Exposed .env files',
        'Insecure CORS configurations',
        'Missing security headers',
        'Exposed debug endpoints',
        'Insecure default credentials',
        'Exposed sensitive configuration files'
      ]
    },
    {
      id: 'A06',
      title: 'Vulnerable Components',
      icon: Database,
      description: 'Analyzes dependency trees for known vulnerabilities and outdated packages.',
      checks: [
        'Known vulnerable dependencies',
        'Outdated packages with security patches',
        'Unmaintained dependencies',
        'Dependencies with known CVEs',
        'npm audit vulnerabilities'
      ]
    },
    {
      id: 'A07',
      title: 'Authentication Failures',
      icon: Lock,
      description: 'Checks for weak authentication mechanisms and session management issues.',
      checks: [
        'Weak password policies',
        'Missing multi-factor authentication',
        'Insecure session management',
        'Session fixation vulnerabilities',
        'Missing authentication on sensitive endpoints'
      ]
    },
    {
      id: 'A08',
      title: 'Software and Data Integrity Failures',
      icon: FileText,
      description: 'Detects integrity verification failures and insecure update mechanisms.',
      checks: [
        'Missing integrity checks',
        'Insecure update mechanisms',
        'Missing code signing',
        'Insecure deserialization',
        'Missing checksum verification'
      ]
    },
    {
      id: 'A09',
      title: 'Security Logging and Monitoring Failures',
      icon: AlertTriangle,
      description: 'Identifies missing or inadequate security logging and monitoring.',
      checks: [
        'Missing security event logging',
        'Insufficient log detail',
        'Missing alert mechanisms',
        'Inadequate monitoring coverage',
        'Missing audit trails'
      ]
    },
    {
      id: 'A10',
      title: 'Server-Side Request Forgery (SSRF)',
      icon: Globe,
      description: 'Scans for SSRF vulnerabilities where the application fetches remote resources.',
      checks: [
        'Unvalidated URL fetching',
        'Missing SSRF protections',
        'Insecure internal network access',
        'Missing URL validation',
        'Insecure proxy configurations'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-white pt-16">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            ← Back to Home
          </button>
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-vibegreen-500/20 p-3 rounded-lg">
              <BookOpen className="w-8 h-8 text-vibegreen-500" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Documentation</h1>
              <p className="text-gray-400 text-lg">Comprehensive guide to VibeSec security scanning</p>
            </div>
          </div>
        </div>

        {/* Introduction */}
        <div className="glass-effect rounded-xl p-8 mb-12 border border-gray-800">
          <h2 className="text-2xl font-semibold mb-4">What Does VibeSec Scan?</h2>
          <p className="text-gray-300 mb-4 leading-relaxed">
            VibeSec performs comprehensive security analysis of your codebase, checking for vulnerabilities 
            across all categories of the <strong className="text-vibegreen-400">OWASP Top 10</strong> security risks. 
            Our automated scanner analyzes your repository's code, dependencies, configuration files, and 
            architecture to identify potential security issues.
          </p>
          <div className="mt-6 p-4 bg-vibegreen-500/10 border border-vibegreen-500/30 rounded-lg">
            <p className="text-sm text-gray-300">
              <strong className="text-vibegreen-400">New to OWASP Top 10?</strong>{' '}
              <a 
                href="https://owasp.org/www-project-top-ten/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-vibegreen-400 hover:text-vibegreen-300 underline inline-flex items-center gap-1"
              >
                Learn more about OWASP Top 10 <ExternalLink className="w-3 h-3 inline" />
              </a>
            </p>
          </div>
        </div>

        {/* OWASP Categories */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-8">OWASP Top 10 Coverage</h2>
          <div className="grid gap-6">
            {owaspCategories.map((category) => {
              const Icon = category.icon;
              return (
                <div 
                  key={category.id} 
                  className="glass-effect rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="bg-vibegreen-500/20 p-3 rounded-lg flex-shrink-0">
                      <Icon className="w-6 h-6 text-vibegreen-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold text-vibegreen-400 bg-vibegreen-500/20 px-2 py-1 rounded">
                          {category.id}
                        </span>
                        <h3 className="text-xl font-semibold">{category.title}</h3>
                      </div>
                      <p className="text-gray-400 mb-4">{category.description}</p>
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-300 mb-2">What We Check:</h4>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {category.checks.map((check, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-400">
                              <span className="text-vibegreen-500 mt-1">•</span>
                              <span>{check}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Additional Features */}
        <div className="glass-effect rounded-xl p-8 border border-gray-800 mb-12">
          <h2 className="text-2xl font-semibold mb-6">Additional Security Checks</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Code className="w-5 h-5 text-vibegreen-500" />
                Tech Stack Detection
              </h3>
              <p className="text-gray-400 text-sm">
                Automatically detects your technology stack (React, Node.js, Python, etc.) to provide 
                context-aware vulnerability scanning.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-vibegreen-500" />
                AI-Powered Fixes
              </h3>
              <p className="text-gray-400 text-sm">
                Get AI-generated code fixes for identified vulnerabilities using Google's Gemini AI. 
                Each fix includes before/after code examples and security recommendations.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Database className="w-5 h-5 text-vibegreen-500" />
                Dependency Analysis
              </h3>
              <p className="text-gray-400 text-sm">
                Deep analysis of your dependency tree, checking for known CVEs and recommending 
                secure package versions.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-vibegreen-500" />
                Security Score
              </h3>
              <p className="text-gray-400 text-sm">
                Receive a comprehensive security score (0-100) based on the severity and quantity 
                of vulnerabilities found in your codebase.
              </p>
            </div>
          </div>
        </div>

        {/* Helpful Links */}
        <div className="glass-effect rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-semibold mb-6">Additional Resources</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <a
              href="https://owasp.org/www-project-top-ten/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-gray-900/50 hover:bg-gray-900 border border-gray-800 rounded-lg transition-colors group"
            >
              <ExternalLink className="w-5 h-5 text-vibegreen-500 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="font-semibold mb-1">OWASP Top 10</h3>
                <p className="text-sm text-gray-400">Official OWASP Top 10 documentation</p>
              </div>
            </a>
            <a
              href="https://cheatsheetseries.owasp.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-gray-900/50 hover:bg-gray-900 border border-gray-800 rounded-lg transition-colors group"
            >
              <ExternalLink className="w-5 h-5 text-vibegreen-500 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="font-semibold mb-1">OWASP Cheat Sheets</h3>
                <p className="text-sm text-gray-400">Security best practices and cheat sheets</p>
              </div>
            </a>
            <a
              href="https://cwe.mitre.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-gray-900/50 hover:bg-gray-900 border border-gray-800 rounded-lg transition-colors group"
            >
              <ExternalLink className="w-5 h-5 text-vibegreen-500 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="font-semibold mb-1">CWE Database</h3>
                <p className="text-sm text-gray-400">Common Weakness Enumeration database</p>
              </div>
            </a>
            <a
              href="https://github.com/advisories"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-gray-900/50 hover:bg-gray-900 border border-gray-800 rounded-lg transition-colors group"
            >
              <ExternalLink className="w-5 h-5 text-vibegreen-500 group-hover:scale-110 transition-transform" />
              <div>
                <h3 className="font-semibold mb-1">GitHub Security Advisories</h3>
                <p className="text-sm text-gray-400">Track security vulnerabilities in open source</p>
              </div>
            </a>
          </div>
        </div>

        {/* Note */}
        <div className="mt-12 p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-200">
            <strong>Note:</strong> This documentation is automatically updated whenever new vulnerability scanners 
            are added to VibeSec. Our scanning capabilities continue to expand to provide comprehensive security 
            coverage for your applications.
          </p>
        </div>
      </div>
    </div>
  );
}

