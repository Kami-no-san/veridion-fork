"use client";

import {
  ChevronDown,
  ExternalLink,
  FileCode,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";

export interface Finding {
  id: string;
  title: string;
  pluginId: string;
  severity: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  codeSnippet: string | null;
  description: string;
  recommendation: string | null;
  aiSummary: string | null;
  confidence: number;
  status: string;
  references?: string[];
}

interface FindingCardProps {
  finding: Finding;
  onStatusChange: (findingId: string, newStatus: string) => void;
}

export const severityConfig: Record<string, { color: string; bg: string; border: string } | undefined> = {
  CRITICAL: { color: "text-red-500", bg: "bg-red-500/10", border: "border-l-red-500" },
  HIGH: { color: "text-orange-500", bg: "bg-orange-500/10", border: "border-l-orange-500" },
  MEDIUM: { color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-l-yellow-500" },
  LOW: { color: "text-green-500", bg: "bg-green-500/10", border: "border-l-green-500" },
  GAS: { color: "text-blue-500", bg: "bg-blue-500/10", border: "border-l-blue-500" },
  INFORMATIONAL: { color: "text-muted-foreground", bg: "bg-muted", border: "border-l-muted-foreground" },
};

const statusOptions = [
  { value: "OPEN", label: "Open" },
  { value: "ACKNOWLEDGED", label: "Acknowledged" },
  { value: "FALSE_POSITIVE", label: "False Positive" },
  { value: "RESOLVED", label: "Resolved" },
];

export function FindingCard({ finding, onStatusChange }: FindingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const defaultConfig: { color: string; bg: string; border: string } = {
    color: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-l-muted-foreground",
  };
  const config = severityConfig[finding.severity] ?? defaultConfig;

  return (
    <div
      className={`bg-card rounded-xl border shadow-sm border-l-4 ${config.border}`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start justify-between px-6 py-4 text-left"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${config.bg} ${config.color}`}
            >
              {finding.severity}
            </span>
            <span className="text-muted-foreground text-xs font-mono">
              {finding.filePath}:{finding.lineStart}-{finding.lineEnd}
            </span>
            <span className="text-muted-foreground text-xs">
              {(finding.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
          <h3 className="text-base font-semibold">{finding.title}</h3>
        </div>

        <div className="ml-4 flex shrink-0 items-center gap-3">
          {/* Status selector */}
          <select
            value={finding.status}
            onChange={(e) => {
              e.stopPropagation();
              onStatusChange(finding.id, e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary ${
              finding.status === "OPEN"
                ? "border-red-500/30 bg-red-500/10 text-red-500"
                : finding.status === "ACKNOWLEDGED"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                  : finding.status === "RESOLVED"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                    : "border-muted bg-muted text-muted-foreground"
            }`}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <ChevronDown
            className={`text-muted-foreground h-4 w-4 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="space-y-4 border-t px-6 py-4">
          {/* Description */}
          <div>
            <p className="text-muted-foreground mb-1 text-xs font-medium">Description</p>
            <p className="text-sm leading-relaxed">{finding.description}</p>
          </div>

          {/* AI Summary */}
          {finding.aiSummary && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <MessageSquare className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-primary text-xs font-medium">AI Analysis</p>
                  <p className="mt-1 text-sm leading-relaxed">{finding.aiSummary}</p>
                </div>
              </div>
            </div>
          )}

          {/* Code Snippet */}
          {finding.codeSnippet && (
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium">
                <FileCode className="mr-1 inline h-3.5 w-3.5" />
                Vulnerable Code
              </p>
              <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 text-sm text-zinc-100">
                <code>{finding.codeSnippet}</code>
              </pre>
            </div>
          )}

          {/* Recommendation */}
          {finding.recommendation && (
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium">Recommendation</p>
              <p className="text-sm leading-relaxed">{finding.recommendation}</p>
            </div>
          )}

          {/* References */}
          {finding.references && finding.references.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium">References</p>
              <div className="flex flex-wrap gap-2">
                {finding.references.map((ref) => (
                  <a
                    key={ref}
                    href={ref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-muted hover:bg-muted/80 inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors"
                  >
                    {ref.length > 50 ? `${ref.slice(0, 50)}...` : ref}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
