'use client';

import { FileCode2, FileJson, FileText, Globe2, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { AuditOption, ReportFormat } from '@/lib/api-client';

interface ReportGeneratorProps {
  audits: AuditOption[];
  isLoading?: boolean;
  error?: string | null;
  onGenerate: (auditId: string, format: ReportFormat, includeAiSummary: boolean) => void;
}

const formats: Array<{
  value: ReportFormat;
  label: string;
  description: string;
  icon: typeof FileText;
}> = [
  { value: 'MARKDOWN', label: 'Markdown', description: 'Readable source report', icon: FileText },
  { value: 'HTML', label: 'HTML', description: 'Shareable web report', icon: Globe2 },
  { value: 'JSON', label: 'JSON', description: 'Machine-readable data', icon: FileJson },
  { value: 'PDF', label: 'PDF', description: 'Placeholder for export', icon: FileCode2 },
];

export function ReportGeneratorForm({
  audits,
  isLoading = false,
  error,
  onGenerate,
}: ReportGeneratorProps) {
  const [auditId, setAuditId] = useState('');
  const [format, setFormat] = useState<ReportFormat>('MARKDOWN');
  const [includeAiSummary, setIncludeAiSummary] = useState(true);

  useEffect(() => {
    if (!auditId && audits[0]) setAuditId(audits[0].id);
  }, [auditId, audits]);

  return (
    <div className="bg-card rounded-xl border p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">Generate a report</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Choose an audit and format to create a shareable security report.
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive mt-5 rounded-lg border p-3 text-sm"
        >
          {error}
        </div>
      )}

      <div className="mt-6 space-y-5">
        <div>
          <label htmlFor="report-audit" className="text-sm font-medium">
            Audit
          </label>
          <select
            id="report-audit"
            value={auditId}
            onChange={(event) => setAuditId(event.target.value)}
            disabled={isLoading || audits.length === 0}
            className="bg-background focus:ring-ring mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 disabled:opacity-50"
          >
            <option value="">{audits.length ? 'Select an audit' : 'No audits available'}</option>
            {audits.map((audit) => (
              <option key={audit.id} value={audit.id}>
                {audit.project.name} · {new Date(audit.createdAt).toLocaleDateString()} ·{' '}
                {audit.status}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="text-sm font-medium">Format</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {formats.map((item) => {
              const Icon = item.icon;
              const selected = format === item.value;
              return (
                <label
                  key={item.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                    selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="report-format"
                    value={item.value}
                    checked={selected}
                    onChange={() => setFormat(item.value)}
                    className="sr-only"
                  />
                  <Icon
                    className={`h-4 w-4 ${selected ? 'text-primary' : 'text-muted-foreground'}`}
                  />
                  <span>
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="text-muted-foreground block text-xs">{item.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3">
          <input
            type="checkbox"
            checked={includeAiSummary}
            onChange={(event) => setIncludeAiSummary(event.target.checked)}
            className="accent-primary h-4 w-4"
          />
          <span>
            <span className="block text-sm font-medium">Include AI analysis</span>
            <span className="text-muted-foreground block text-xs">
              Add finding summaries to the report.
            </span>
          </span>
        </label>

        <button
          type="button"
          disabled={!auditId || isLoading}
          onClick={() => onGenerate(auditId, format, includeAiSummary)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? 'Generating...' : 'Generate report'}
        </button>
      </div>
    </div>
  );
}
