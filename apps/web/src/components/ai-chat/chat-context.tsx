'use client';

import { AlertTriangle, ChevronRight, FileSearch, MessageSquarePlus } from 'lucide-react';

export interface AuditOption {
  id: string;
  name: string;
  status: string;
  securityScore: number | null;
}

interface ChatContextProps {
  audits: AuditOption[];
  selectedAuditId: string;
  onSelectAudit: (auditId: string) => void;
  onClearConversation: () => void;
  loadingAudits: boolean;
}

export function ChatContext({
  audits,
  selectedAuditId,
  onSelectAudit,
  onClearConversation,
  loadingAudits,
}: ChatContextProps) {
  const selectedAudit = audits.find((a) => a.id === selectedAuditId);

  return (
    <div className="hidden w-64 shrink-0 space-y-4 xl:block">
      {/* Audit Selector */}
      <div className="bg-card rounded-xl border p-4 shadow-sm">
        <h3 className="text-sm font-semibold">Audit Context</h3>
        {loadingAudits ? (
          <div className="mt-3 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-muted h-8 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : audits.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-xs">
            No audits available. Create one to start chatting.
          </p>
        ) : (
          <div className="mt-3 space-y-1">
            {audits.map((audit) => (
              <button
                key={audit.id}
                onClick={() => onSelectAudit(audit.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selectedAuditId === audit.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <ChevronRight
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                    selectedAuditId === audit.id ? 'rotate-90' : ''
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs">{audit.name}</p>
                  <p className="text-muted-foreground text-[10px]">
                    {audit.status}
                    {audit.securityScore !== null && ` · ${audit.securityScore}/100`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Audit Info */}
      {selectedAudit && (
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Current Audit</h3>
            <button
              onClick={onClearConversation}
              className="text-muted-foreground hover:text-primary rounded-md p-1 transition-colors"
              title="New conversation"
              aria-label="New conversation"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <FileSearch className="text-primary h-4 w-4" />
              <span className="text-sm font-medium">{selectedAudit.name}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle className="text-muted-foreground h-3.5 w-3.5" />
              <span className="text-muted-foreground">Status: {selectedAudit.status}</span>
            </div>
            {selectedAudit.securityScore !== null && (
              <div className="flex items-center gap-2">
                <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                  <div
                    className={`h-full rounded-full transition-all ${
                      selectedAudit.securityScore >= 80
                        ? 'bg-green-500'
                        : selectedAudit.securityScore >= 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${selectedAudit.securityScore}%` }}
                  />
                </div>
                <span className="text-xs font-medium tabular-nums">
                  {selectedAudit.securityScore}/100
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Tips */}
      <div className="bg-card rounded-xl border p-4 shadow-sm">
        <h3 className="text-sm font-semibold">Tips</h3>
        <ul className="text-muted-foreground mt-3 space-y-2 text-xs">
          <li className="flex gap-2">
            <span className="text-primary mt-0.5">•</span>
            Ask about specific findings by name or severity
          </li>
          <li className="flex gap-2">
            <span className="text-primary mt-0.5">•</span>
            Request fix suggestions with code examples
          </li>
          <li className="flex gap-2">
            <span className="text-primary mt-0.5">•</span>I can explain why a vulnerability is
            dangerous
          </li>
        </ul>
      </div>
    </div>
  );
}
