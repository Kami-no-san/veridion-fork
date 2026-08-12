'use client';

import { AlertCircle, CheckCircle2, Clock, Loader2, Search, Shield, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { apiGet } from '@/lib/api-helpers';

interface AuditItem {
  id: string;
  status: string;
  securityScore: number | null;
  createdAt: string;
  project: {
    name: string;
  };
  _count: {
    findings: number;
  };
}

interface ApiResponse {
  success: boolean;
  data: {
    data: AuditItem[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
}

const statusIcon: Record<string, React.ElementType> = {
  COMPLETED: CheckCircle2,
  SCANNING: Clock,
  VERIFIED: Shield,
  FAILED: XCircle,
  PENDING: Clock,
};

const statusColor: Record<string, string> = {
  COMPLETED: 'text-emerald-500',
  SCANNING: 'text-blue-500',
  VERIFIED: 'text-violet-500',
  FAILED: 'text-red-500',
  PENDING: 'text-amber-500',
};

export default function AuditsPage() {
  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    async function fetchAudits() {
      try {
        const params = new URLSearchParams({ limit: '50', sortOrder: 'desc' });
        if (statusFilter) params.set('status', statusFilter);

        const json = await apiGet<ApiResponse>(`/api/v1/audits?${params.toString()}`);
        if (json.success && json.data) {
          setAudits(json.data.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audits');
      } finally {
        setLoading(false);
      }
    }

    void fetchAudits();
  }, [statusFilter]);

  const filteredAudits = audits.filter((a) => {
    if (search && !a.project.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Loading state
  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <AlertCircle className="text-destructive h-10 w-10" />
        <div className="text-center">
          <h2 className="text-lg font-semibold">Failed to Load Audits</h2>
          <p className="text-muted-foreground mt-1 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit History</h1>
        <p className="text-muted-foreground mt-1">Review past audits and their findings.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audits..."
            className="bg-background focus:ring-ring placeholder:text-muted-foreground w-full rounded-lg border py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-background focus:ring-ring rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
        >
          <option value="">All Statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="SCANNING">Scanning</option>
          <option value="VERIFIED">Verified</option>
          <option value="FAILED">Failed</option>
          <option value="PENDING">Pending</option>
        </select>
      </div>

      {/* Empty state */}
      {filteredAudits.length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center">
          <Search className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
          <p className="text-muted-foreground text-sm">
            {audits.length === 0
              ? 'No audits yet. Run your first audit to get started.'
              : 'No audits match your search.'}
          </p>
        </div>
      ) : (
        <div className="bg-card overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-muted-foreground border-b text-left text-sm">
                  <th className="pb-3 pl-6 font-medium">Project</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Score</th>
                  <th className="pb-3 font-medium">Findings</th>
                  <th className="pb-3 pr-6 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredAudits.map((audit) => {
                  const Icon = statusIcon[audit.status] ?? Clock;
                  const color = statusColor[audit.status] ?? 'text-muted-foreground';
                  return (
                    <tr key={audit.id}>
                      <td className="py-3 pl-6">
                        <Link
                          href={`/dashboard/audits/${audit.id}`}
                          className="hover:text-primary text-sm font-medium transition-colors"
                        >
                          {audit.project.name}
                        </Link>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 text-sm ${color}`}>
                          <Icon className="h-3.5 w-3.5" /> {audit.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-sm">
                          {audit.securityScore !== null ? `${audit.securityScore}/100` : '—'}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-sm">{audit._count?.findings ?? '—'}</span>
                      </td>
                      <td className="text-muted-foreground py-3 pr-6 text-sm">
                        {new Date(audit.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
