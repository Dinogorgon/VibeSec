import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { 
  Shield, 
  Globe, 
  Database, 
  Lock,
  Bot,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { ScanResult, Severity, User, Vulnerability } from '../types';
import FixModal from './FixModal';
import RepositoryAccessErrorModal from './RepositoryAccessErrorModal';
import { checkRepositoryAccess } from '../services/apiService';
import { Loader2 } from 'lucide-react';

interface ResultsViewProps {
  result: ScanResult;
  onReset: () => void;
  user?: User | null;
  token?: string | null;
  onApiKeyRequired?: (isLogin: boolean) => void;
}

const SEVERITY_COLORS: Record<Severity, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#3b82f6',
};

interface VulnerabilityGroup {
  key: string;
  title: string;
  description: string;
  severity: Severity;
  vulnerabilities: Vulnerability[];
}

export default function ResultsView({ result, onReset, user, token, onApiKeyRequired }: ResultsViewProps) {
  const [selectedVulnerability, setSelectedVulnerability] = useState<string | null>(null);
  const [showAccessError, setShowAccessError] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState<string | null>(null); // Track which vulnerability is being checked
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group vulnerabilities by title + description
  const vulnerabilityGroups = useMemo(() => {
    const groups = new Map<string, VulnerabilityGroup>();
    
    result.vulnerabilities.forEach(vuln => {
      const key = `${vuln.title}|${vuln.description}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          title: vuln.title,
          description: vuln.description,
          severity: vuln.severity,
          vulnerabilities: []
        });
      }
      groups.get(key)!.vulnerabilities.push(vuln);
    });
    
    return Array.from(groups.values());
  }, [result.vulnerabilities]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allKeys = new Set(vulnerabilityGroups.map(g => g.key));
    setExpandedGroups(allKeys);
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const handleFixClick = async (vulnId: string) => {
    // Check if user is logged in
    if (!user || !token) {
      if (onApiKeyRequired) {
        onApiKeyRequired(true); // Show login prompt
      }
      return;
    }

    // Check if user has API key
    if (!user.hasGeminiKey) {
      if (onApiKeyRequired) {
        onApiKeyRequired(false); // Show API key input prompt
      }
      return;
    }

    // Check repository access before showing fix modal
    setCheckingAccess(vulnId); // Set specific vulnerability ID
    try {
      const accessCheck = await checkRepositoryAccess(token, result.url);
      
      if (!accessCheck.hasAccess) {
        setShowAccessError(true);
        setCheckingAccess(null);
        return;
      }

      // User has access, proceed with fix
      setSelectedVulnerability(vulnId);
    } catch (error) {
      console.error('Failed to check repository access:', error);
      // If check fails, assume no access to be safe
      setShowAccessError(true);
    } finally {
      setCheckingAccess(null);
    }
  };

  const severityCounts = result.vulnerabilities.reduce((acc, vuln) => {
    acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
    return acc;
  }, {} as Record<Severity, number>);

  // If no vulnerabilities, show a green "Perfect" segment
  const chartData = result.vulnerabilities.length === 0
    ? [{ name: 'Perfect', value: 100, color: '#10b981' }] // vibegreen-500
    : [
        { name: 'Critical', value: severityCounts.Critical || 0, color: SEVERITY_COLORS.Critical },
        { name: 'High', value: severityCounts.High || 0, color: SEVERITY_COLORS.High },
        { name: 'Medium', value: severityCounts.Medium || 0, color: SEVERITY_COLORS.Medium },
        { name: 'Low', value: severityCounts.Low || 0, color: SEVERITY_COLORS.Low },
      ].filter(item => item.value > 0);

  const getSeverityBg = (severity: Severity) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'High':
        return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
      case 'Medium':
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
      case 'Low':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
    }
  };

  const criticalCount = severityCounts.Critical || 0;
  const healthColor = criticalCount > 0 ? 'text-red-500' : (severityCounts.High || 0) > 0 ? 'text-orange-500' : 'text-emerald-500';

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <div className="pt-16 p-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Top Three Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Security Score Card */}
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <Shield className="w-24 h-24" />
              </div>
              <div className="relative">
                <h3 className="text-gray-400 font-medium mb-1 text-sm">Security Score</h3>
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-5xl font-bold font-mono ${healthColor}`}>
                    {result.score}/100
                  </p>
                  <div className="h-24 w-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={40}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {result.score === 100 || result.vulnerabilities.length === 0 
                    ? 'Perfect Health' 
                    : result.score < 60 
                    ? 'Unsafe for Production' 
                    : 'Needs Remediation'}
                </p>
              </div>
            </div>

            {/* Detected Stack Card */}
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg">
              <h3 className="text-gray-400 font-medium mb-4 text-sm">Detected Stack</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {result.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-sm text-gray-300 font-mono"
                  >
                    {tech}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-6">
                <div className="flex items-center gap-1">
                  <Globe className="w-4 h-4" />
                  <span>Next.js</span>
                </div>
                <div className="flex items-center gap-1">
                  <Database className="w-4 h-4" />
                  <span>PostgreSQL</span>
                </div>
                <div className="flex items-center gap-1">
                  <Lock className="w-4 h-4" />
                  <span>OAuth</span>
                </div>
              </div>
            </div>

            {/* Vibe Status Card */}
            <div className={`bg-gradient-to-br ${result.vulnerabilities.length === 0 
              ? 'from-emerald-900/40 to-gray-900 border-emerald-500/30' 
              : 'from-indigo-900/40 to-gray-900 border-indigo-500/30'} p-6 rounded-xl shadow-lg flex flex-col justify-center items-center text-center`}>
              <h3 className={`font-medium mb-2 text-sm ${result.vulnerabilities.length === 0 ? 'text-emerald-200' : 'text-indigo-200'}`}>
                Vibe Status
              </h3>
              <p className={`text-sm mb-4 ${result.vulnerabilities.length === 0 ? 'text-emerald-400/80' : 'text-indigo-400/80'}`}>
                {result.vulnerabilities.length === 0 
                  ? 'Your vibe is currently ready for production and full testing. No issues detected!'
                  : result.vulnerabilities.length <= 3
                  ? `Your vibe has ${result.vulnerabilities.length} minor issue${result.vulnerabilities.length > 1 ? 's' : ''}. Quick fixes recommended.`
                  : result.vulnerabilities.filter(v => v.severity === 'Critical' || v.severity === 'High').length > 0
                  ? 'Your vibe is currently compromised. Fix critical issues to restore the vibe.'
                  : `Your vibe has ${result.vulnerabilities.length} issues. Review and fix to improve security.`}
              </p>
              <button
                onClick={onReset}
                className="text-sm px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 transition-colors"
              >
                Scan Another Project
              </button>
            </div>
          </div>

          {/* Vulnerabilities Section */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-gray-800">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">
                  Vulnerabilities Found{' '}
                  <span className="text-gray-500 text-sm font-normal">
                    ({result.vulnerabilities.length})
                  </span>
                </h2>
                <div className="flex gap-2 text-sm flex-wrap">
                  {severityCounts.Critical > 0 && (
                    <span className="flex items-center gap-1 text-red-400">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      Critical ({severityCounts.Critical})
                    </span>
                  )}
                  {severityCounts.High > 0 && (
                    <span className="flex items-center gap-1 text-orange-400">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      High ({severityCounts.High})
                    </span>
                  )}
                  {severityCounts.Medium > 0 && (
                    <span className="flex items-center gap-1 text-yellow-400">
                      <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                      Medium ({severityCounts.Medium})
                    </span>
                  )}
                  {severityCounts.Low > 0 && (
                    <span className="flex items-center gap-1 text-blue-400">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Low ({severityCounts.Low})
                    </span>
                  )}
                  {result.vulnerabilities.length === 0 && (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      None Found
                    </span>
                  )}
                </div>
              </div>
              {result.vulnerabilities.length > 0 && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={expandAll}
                    className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition-colors"
                  >
                    Expand All
                  </button>
                  <button
                    onClick={collapseAll}
                    className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition-colors"
                  >
                    Collapse All
                  </button>
                </div>
              )}
            </div>

            <div className="divide-y divide-gray-800">
              {vulnerabilityGroups.map((group) => {
                const isExpanded = expandedGroups.has(group.key);
                const isGrouped = group.vulnerabilities.length > 1;
                
                return (
                  <div key={group.key} className="hover:bg-gray-800/50 transition-colors">
                    {/* Group Header */}
                    <div
                      className={`p-6 ${isGrouped ? 'cursor-pointer' : ''}`}
                      onClick={() => isGrouped && toggleGroup(group.key)}
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {isGrouped && (
                              <span className="text-gray-500">
                                {isExpanded ? (
                                  <ChevronDown className="w-5 h-5" />
                                ) : (
                                  <ChevronRight className="w-5 h-5" />
                                )}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getSeverityBg(group.severity)}`}>
                              {group.severity.toUpperCase()}
                            </span>
                            <h3 className="text-lg font-medium text-gray-200">
                              {group.title}
                              {isGrouped && (
                                <span className="text-gray-500 text-sm font-normal ml-2">
                                  ({group.vulnerabilities.length} instances)
                                </span>
                              )}
                            </h3>
                          </div>
                          <p className="text-gray-400 text-sm mb-3">{group.description}</p>
                          {!isGrouped && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
                              <span className="text-gray-600">LOCATION:</span>
                              <span className="text-gray-400 bg-gray-800 px-1 rounded">{group.vulnerabilities[0].location}</span>
                            </div>
                          )}
                        </div>
                        {!isGrouped && (
                          <div className="flex items-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFixClick(group.vulnerabilities[0].id);
                              }}
                              disabled={checkingAccess === group.vulnerabilities[0].id}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-vibegreen-600 hover:bg-vibegreen-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium shadow-lg shadow-vibegreen-900/20 transition-all hover:scale-105"
                            >
                              {checkingAccess === group.vulnerabilities[0].id ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Checking...
                                </>
                              ) : (
                                <>
                                  <Bot className="w-4 h-4" />
                                  Fix with AI
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Expanded Group Content */}
                    {isGrouped && isExpanded && (
                      <div className="border-t border-gray-800 bg-gray-800/30">
                        {group.vulnerabilities.map((vuln, index) => (
                          <div
                            key={vuln.id}
                            className={`p-6 ${index < group.vulnerabilities.length - 1 ? 'border-b border-gray-800' : ''}`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 text-xs text-gray-500 font-mono mb-2">
                                  <span className="text-gray-600">INSTANCE {index + 1}:</span>
                                  <span className="text-gray-400 bg-gray-800 px-1 rounded">{vuln.location}</span>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFixClick(vuln.id);
                                  }}
                                  disabled={checkingAccess === vuln.id}
                                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-vibegreen-600 hover:bg-vibegreen-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium shadow-lg shadow-vibegreen-900/20 transition-all hover:scale-105"
                                >
                                  {checkingAccess === vuln.id ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      Checking...
                                    </>
                                  ) : (
                                    <>
                                      <Bot className="w-4 h-4" />
                                      Fix with AI
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fix Modal */}
          {selectedVulnerability && user && token && (
            <FixModal
              vulnerability={result.vulnerabilities.find((v) => v.id === selectedVulnerability)!}
              techStack={result.techStack}
              user={user}
              token={token}
              repositoryUrl={result.url}
              onClose={() => setSelectedVulnerability(null)}
            />
          )}

          {/* Repository Access Error Modal */}
          {showAccessError && (
            <RepositoryAccessErrorModal
              repositoryUrl={result.url}
              onClose={() => setShowAccessError(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

