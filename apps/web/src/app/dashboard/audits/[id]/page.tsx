'use client';

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  MessageSquare,
  Shield,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import type { Finding } from '@/components/audits/finding-card';
import { FindingList } from '@/components/audits/finding-list';
import { SeverityChart } from '@/components/audits/severity-chart';
import { apiGet, apiPatch } from '@/lib/api-helpers';

interface AuditData {
  id: string;
  status: string;
  securityScore: number | null;
  commitHash: string | null;
  reportHash: string | null;
  transactionHash: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  project: {
    id: string;
    name: string;
  };
  findings: Finding[];
}

const statusIcon: Record<string, React.ElementType> = {
  COMPLETED: CheckCircle2,
  VERIFIED: Shield,
  SCANNING: Clock,
  FAILED: XCircle,
  PENDING: Clock,
};

const statusColor: Record<string, string> = {
  COMPLETED: 'text-emerald-500',
  VERIFIED: 'text-violet-500',
  SCANNING: 'text-blue-500',
  FAILED: 'text-red-500',
  PENDING: 'text-amber-500',
};

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'GAS', 'INFORMATIONAL'];

export default function AuditDetailPage() {
  const params = useParams();
  const auditId = params.id as string;

  const [audit, setAudit] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await apiGet<AuditData>(`/api/v1/audits/${auditId}`);
      setAudit(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit');
    } finally {
      setLoading(false);
    }
  }, [auditId]);

  useEffect(() => {
    void fetchAudit();
  }, [fetchAudit]);

  const handleStatusChange = useCallback(
    async (findingId: string, newStatus: string) => {
      if (!audit) return;

      // Optimistic update
      setAudit({
        ...audit,
        findings: audit.findings.map((f) => (f.id === findingId ? { ...f, status: newStatus } : f)),
      });

      try {
        await apiPatch(`/api/v1/audits/findings/${findingId}`, {
          status: newStatus,
        });
      } catch (err) {
        console.error('Failed to update finding status:', err);
        // Revert on failure
        void fetchAudit();
      }
    },
    [audit, fetchAudit],
  );

  const handleVerifyOnChain = useCallback(() => {
    if (!audit) return;
    // Placeholder: will be wired to blockchain verification in #40 or a future issue
    alert(
      `Blockchain verification for audit ${audit.id} will be available soon. Connect your Stellar wallet to proceed.`,
    );
  }, [audit]);

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  // ---- Error state ----
  if (error || !audit) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <AlertCircle className="text-destructive h-10 w-10" />
        <div className="text-center">
          <h2 className="text-lg font-semibold">Failed to Load Audit</h2>
          <p className="text-muted-foreground mt-1 text-sm">{error ?? 'Audit not found'}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/audits"
            className="bg-card hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
          >
            Back to Audits
          </Link>
          <button
            onClick={() => {
              void fetchAudit();
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ---- Compute derived data ----
  const StatusIcon = statusIcon[audit.status] ?? Clock;
  const severityCounts = audit.findings.reduce(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const duration =
    audit.startedAt && audit.completedAt
      ? formatDuration(audit.startedAt, audit.completedAt)
      : null;

  const completedDate = audit.completedAt?.split('T')[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/dashboard/audits"
          className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-2 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Audit Detail</h1>
          <p className="text-muted-foreground mt-1">
            <Link href={`/dashboard/projects/${audit.project.id}`} className="hover:text-primary">
              {audit.project.name}
            </Link>
          </p>
        </div>
        <div className="flex gap-2">
          <button className="hover:bg-muted inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors">
            <Download className="h-4 w-4" /> Export
          </button>
          <button
            onClick={handleVerifyOnChain}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            <Shield className="h-4 w-4" /> Verify on-chain
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
        {[
          {
            label: 'Security Score',
            value: audit.securityScore !== null ? `${audit.securityScore}/100` : '—',
            color:
              audit.securityScore !== null
                ? audit.securityScore >= 80
                  ? 'text-emerald-500'
                  : audit.securityScore >= 50
                    ? 'text-amber-500'
                    : 'text-red-500'
                : 'text-muted-foreground',
          },
          {
            label: 'Status',
            value: audit.status,
            color: statusColor[audit.status] ?? '',
            icon: StatusIcon,
          },
          {
            label: 'Findings',
            value: audit.findings.length,
            color: 'text-violet-500',
          },
          {
            label: 'Duration',
            value: duration ?? '—',
            color: 'text-blue-500',
          },
          {
            label: 'Completed',
            value: completedDate ?? '—',
            color: 'text-muted-foreground',
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border p-4 shadow-sm">
            <p className="text-muted-foreground text-xs font-medium">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>
              {stat.icon && <stat.icon className="mr-1 inline h-5 w-5" />}
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Main content: findings + sidebar */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Findings with filters */}
        <div className="lg:col-span-3">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Findings ({audit.findings.length})</h2>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(severityCounts)
                .sort((a, b) => SEVERITY_ORDER.indexOf(a[0]) - SEVERITY_ORDER.indexOf(b[0]))
                .map(([severity, count]) => {
                  const severityBadgeColors: Record<string, string> = {
                    CRITICAL: 'bg-red-500/10 text-red-500',
                    HIGH: 'bg-orange-500/10 text-orange-500',
                    MEDIUM: 'bg-yellow-500/10 text-yellow-500',
                    LOW: 'bg-green-500/10 text-green-500',
                    GAS: 'bg-blue-500/10 text-blue-500',
                    INFORMATIONAL: 'bg-muted text-muted-foreground',
                  };
                  return (
                    <span
                      key={severity}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${severityBadgeColors[severity] ?? ''}`}
                    >
                      {severity} {count}
                    </span>
                  );
                })}
            </div>
          </div>

          <FindingList
            findings={audit.findings}
            onStatusChange={(id, status) => {
              void handleStatusChange(id, status);
            }}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <SeverityChart counts={severityCounts} />

          {/* Audit metadata */}
          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <h3 className="text-sm font-semibold">Audit Info</h3>
            <div className="mt-3 space-y-2 text-sm">
              {audit.commitHash && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Commit</span>
                  <span className="font-mono text-xs">{audit.commitHash.slice(0, 10)}...</span>
                </div>
              )}
              {audit.reportHash && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Report Hash</span>
                  <span className="font-mono text-xs">{audit.reportHash.slice(0, 10)}...</span>
                </div>
              )}
              {audit.transactionHash && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tx Hash</span>
                  <span className="font-mono text-xs">{audit.transactionHash.slice(0, 10)}...</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="text-xs">{new Date(audit.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <h3 className="text-sm font-semibold">Quick Actions</h3>
            <div className="mt-3 space-y-2">
              <button className="hover:bg-muted w-full rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition-colors">
                <Download className="mr-2 inline h-4 w-4" />
                Download Report
              </button>
              <button
                onClick={handleVerifyOnChain}
                className="hover:bg-muted w-full rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition-colors"
              >
                <Shield className="mr-2 inline h-4 w-4" />
                Verify on Stellar
              </button>
              <Link
                href="/dashboard/ai-chat"
                className="hover:bg-muted block w-full rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition-colors"
              >
                <MessageSquare className="mr-2 inline h-4 w-4" />
                Ask AI About Findings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Helpers ----

function formatDuration(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  const mins = Math.floor(diffMs / 60000);

  if (mins < 1) return '<1 min';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
}
