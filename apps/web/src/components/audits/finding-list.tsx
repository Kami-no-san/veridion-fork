'use client';

import { Filter, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { type Finding, FindingCard } from './finding-card';

interface FindingListProps {
  findings: Finding[];
  onStatusChange: (findingId: string, newStatus: string) => void;
}

const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'GAS', 'INFORMATIONAL'];

export function FindingList({ findings, onStatusChange }: FindingListProps) {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const availablePlugins = useMemo(() => {
    const plugins = new Set(findings.map((f) => f.pluginId));
    return Array.from(plugins).sort();
  }, [findings]);

  const [pluginFilter, setPluginFilter] = useState<string>('');

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (search && !f.title.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (severityFilter && f.severity !== severityFilter) return false;
      if (statusFilter && f.status !== statusFilter) return false;
      if (pluginFilter && f.pluginId !== pluginFilter) return false;
      return true;
    });
  }, [findings, search, severityFilter, statusFilter, pluginFilter]);

  const severityCounts = useMemo(() => {
    return findings.reduce(
      (acc, f) => {
        acc[f.severity] = (acc[f.severity] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [findings]);

  const hasActiveFilters = search || severityFilter || statusFilter || pluginFilter;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search findings..."
            className="bg-background focus:ring-ring placeholder:text-muted-foreground w-full rounded-lg border py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2"
          />
        </div>

        {/* Severity filter */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-background focus:ring-ring rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
        >
          <option value="">All Severities</option>
          {severityOrder.map((s) => (
            <option key={s} value={s}>
              {s} ({severityCounts[s] ?? 0})
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-background focus:ring-ring rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="FALSE_POSITIVE">False Positive</option>
          <option value="RESOLVED">Resolved</option>
        </select>

        {/* Plugin filter */}
        {availablePlugins.length > 1 && (
          <select
            value={pluginFilter}
            onChange={(e) => setPluginFilter(e.target.value)}
            className="bg-background focus:ring-ring rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
          >
            <option value="">All Plugins</option>
            {availablePlugins.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}

        {/* Active filter indicator */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearch('');
              setSeverityFilter('');
              setStatusFilter('');
              setPluginFilter('');
            }}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
          >
            <Filter className="h-3 w-3" />
            Clear filters ({filteredFindings.length})
          </button>
        )}
      </div>

      {/* Findings list */}
      {filteredFindings.length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center">
          <Search className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
          <p className="text-muted-foreground text-sm">
            {hasActiveFilters
              ? 'No findings match your filters. Try adjusting or clearing them.'
              : 'No findings detected for this audit.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFindings.map((finding) => (
            <FindingCard key={finding.id} finding={finding} onStatusChange={onStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
}
