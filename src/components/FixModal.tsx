import { useState, useEffect } from 'react';
import { X, Loader2, Check, XCircle, RefreshCw, ChevronDown, ChevronRight, FileText, FilePlus } from 'lucide-react';
import { Vulnerability, User } from '../types';
import { generateFixWithAI, applyFixToRepository, repromptFix, FixData, FileChange } from '../services/apiService';
import FixSuccessPanel from './FixSuccessPanel';

interface FixModalProps {
  vulnerability: Vulnerability;
  techStack: string[];
  user: User;
  token: string;
  repositoryUrl: string;
  onClose: () => void;
}

export default function FixModal({
  vulnerability,
  techStack,
  user: _user,
  token,
  repositoryUrl,
  onClose,
}: FixModalProps) {
  const [fixData, setFixData] = useState<FixData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [reprompting, setReprompting] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [noOtherSolution, setNoOtherSolution] = useState(false);
  const [showSuccessPanel, setShowSuccessPanel] = useState(false);
  const [successData, setSuccessData] = useState<{ prUrl: string; prNumber: number; branchName: string; branchUrl: string } | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerateFix = async (useExisting: boolean = true) => {
    // Prevent duplicate calls
    if (hasGenerated && useExisting) {
      return;
    }
    
    setLoading(true);
    setError(null);
    setNoOtherSolution(false);
    
    try {
      const result = await generateFixWithAI(token, vulnerability, techStack, repositoryUrl, useExisting);
      setFixData(result.fix);
      setAttemptNumber(result.attemptNumber);
      setHasGenerated(true);
      
      // Expand first file by default
      if (result.fix.files.length > 0) {
        setExpandedFiles(new Set([result.fix.files[0].filePath]));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate fix';
      setError(errorMessage);
      
      // Check if it's a "no other solution" case
      if (errorMessage.includes('No other solution') || errorMessage.includes('no other')) {
        setNoOtherSolution(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReprompt = async () => {
    setReprompting(true);
    setError(null);
    setNoOtherSolution(false);
    setHasGenerated(false); // Reset flag for reprompt
    
    try {
      const result = await repromptFix(token, vulnerability, techStack, repositoryUrl);
      setFixData(result.fix);
      setAttemptNumber(result.attemptNumber);
      setHasGenerated(true);
      
      // Expand first file by default
      if (result.fix.files.length > 0) {
        setExpandedFiles(new Set([result.fix.files[0].filePath]));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reprompt fix';
      setError(errorMessage);
      
      // Check if it's a "no other solution" case
      if (errorMessage.includes('No other solution') || errorMessage.includes('no other')) {
        setNoOtherSolution(true);
      }
    } finally {
      setReprompting(false);
    }
  };

  const handleAccept = async () => {
    if (!fixData) return;
    
    setApplying(true);
    setError(null);
    
    try {
      const result = await applyFixToRepository(token, vulnerability.id, repositoryUrl, attemptNumber);
      setSuccessData({
        prUrl: result.prUrl,
        prNumber: result.prNumber,
        branchName: result.branchName,
        branchUrl: result.branchUrl,
      });
      setShowSuccessPanel(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply fix';
      setError(errorMessage);
    } finally {
      setApplying(false);
    }
  };

  const toggleFile = (filePath: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filePath)) {
      newExpanded.delete(filePath);
    } else {
      newExpanded.add(filePath);
    }
    setExpandedFiles(newExpanded);
  };

  // Auto-generate fix on mount
  useEffect(() => {
    handleGenerateFix(true); // Try to use existing first
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderFileDiff = (fileChange: FileChange) => {
    const isExpanded = expandedFiles.has(fileChange.filePath);
    
    if (fileChange.isNewFile) {
      // New file - show all content as added
      const lines = (fileChange.fullContent || '').split('\n');
      
      return (
        <div key={fileChange.filePath} className="border border-gray-800 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleFile(fileChange.filePath)}
            className="w-full flex items-center gap-2 p-4 bg-gray-900/50 hover:bg-gray-900 border-b border-gray-800 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
            <FilePlus className="w-4 h-4 text-vibegreen-500" />
            <span className="font-mono text-sm text-gray-300">{fileChange.filePath}</span>
            <span className="ml-auto text-xs text-vibegreen-400 bg-vibegreen-500/20 px-2 py-1 rounded">
              New File
            </span>
          </button>
          
          {isExpanded && (
            <div className="bg-gray-950 p-4 font-mono text-sm">
              {lines.map((line, idx) => (
                <div key={idx} className="flex">
                  <div className="w-12 text-right pr-4 text-gray-600 select-none">{idx + 1}</div>
                  <div className="flex-1 bg-vibegreen-500/20 text-gray-200 pl-4">
                    <span className="text-vibegreen-400">+</span> {line || ' '}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    } else {
      // Modified file - show diff
      const changes = fileChange.changes.sort((a, b) => a.lineNumber - b.lineNumber);
      const maxLine = Math.max(...changes.map(c => c.lineNumber));
      const minLine = Math.min(...changes.map(c => c.lineNumber));
      
      // Build a map of line numbers to changes
      const changeMap = new Map<number, Array<{ type: 'added' | 'removed' | 'modified'; content: string }>>();
      changes.forEach(change => {
        if (!changeMap.has(change.lineNumber)) {
          changeMap.set(change.lineNumber, []);
        }
        changeMap.get(change.lineNumber)!.push({ type: change.type, content: change.content });
      });
      
      return (
        <div key={fileChange.filePath} className="border border-gray-800 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleFile(fileChange.filePath)}
            className="w-full flex items-center gap-2 p-4 bg-gray-900/50 hover:bg-gray-900 border-b border-gray-800 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
            <FileText className="w-4 h-4 text-blue-500" />
            <span className="font-mono text-sm text-gray-300">{fileChange.filePath}</span>
            <span className="ml-auto text-xs text-gray-400">
              {changes.filter(c => c.type === 'removed').length} removed, {changes.filter(c => c.type === 'added').length} added
            </span>
          </button>
          
          {isExpanded && (
            <div className="bg-gray-950 p-4 font-mono text-sm">
              {Array.from({ length: maxLine - minLine + 1 }, (_, i) => minLine + i).map((lineNum) => {
                const lineChanges = changeMap.get(lineNum) || [];
                if (lineChanges.length === 0) return null;
                
                return lineChanges.map((change, idx) => (
                  <div key={`${lineNum}-${idx}`} className="flex">
                    <div className="w-12 text-right pr-4 text-gray-600 select-none">{lineNum}</div>
                    <div className={`flex-1 pl-4 ${
                      change.type === 'added' 
                        ? 'bg-vibegreen-500/20 text-gray-200' 
                        : change.type === 'removed'
                        ? 'bg-red-500/20 text-gray-200'
                        : 'bg-yellow-500/20 text-gray-200'
                    }`}>
                      <span className={
                        change.type === 'added' 
                          ? 'text-vibegreen-400' 
                          : change.type === 'removed'
                          ? 'text-red-400'
                          : 'text-yellow-400'
                      }>
                        {change.type === 'added' ? '+' : change.type === 'removed' ? '-' : '~'}
                      </span> {change.content}
                    </div>
                  </div>
                ));
              })}
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="glass-effect rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-2xl font-semibold mb-1">{vulnerability.title}</h2>
            <p className="text-sm text-gray-400 font-mono">{vulnerability.location}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-vibegreen-500 animate-spin mb-4" />
              <p className="text-gray-400">Generating AI-powered fix...</p>
            </div>
          )}

          {error && !noOtherSolution && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {noOtherSolution && (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 mb-4">
              <p className="text-yellow-400">
                No other solution found. The current fix suggestion remains the same.
              </p>
            </div>
          )}

          {fixData && !loading && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                <h3 className="text-lg font-semibold mb-2">Fix Summary</h3>
                <p className="text-gray-300 text-sm">{fixData.summary}</p>
              </div>

              {/* File Changes */}
              <div>
                <h3 className="text-lg font-semibold mb-4">File Changes</h3>
                <div className="space-y-2">
                  {fixData.files.map(fileChange => renderFileDiff(fileChange))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {fixData && !loading && (
          <div className="flex items-center justify-between p-6 border-t border-gray-800 bg-gray-900/50">
            <button
              onClick={handleReprompt}
              disabled={reprompting || applying}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {reprompting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Reprompting...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Reprompt
                </>
              )}
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                disabled={applying}
                className="flex items-center gap-2 px-6 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Deny
              </button>
              <button
                onClick={handleAccept}
                disabled={applying}
                className="flex items-center gap-2 px-6 py-2 bg-vibegreen-500 hover:bg-vibegreen-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
              >
                {applying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Accept & Apply
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Success Panel */}
      {showSuccessPanel && successData && (
        <FixSuccessPanel
          prUrl={successData.prUrl}
          prNumber={successData.prNumber}
          branchName={successData.branchName}
          branchUrl={successData.branchUrl}
          onClose={() => {
            setShowSuccessPanel(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}
