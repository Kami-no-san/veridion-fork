'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, ChevronDown, Clock3, FileText, RefreshCw, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { ReportGeneratorForm } from '@/components/reports/report-generator';
import { ReportPreview } from '@/components/reports/report-preview';
import {
  fetchAudits,
  fetchReports,
  type GeneratedReport,
  generateReport,
  type ReportFormat,
  type ReportHistoryItem,
} from '@/lib/api-client';

const statusColors: Record<string, string> = {
  COMPLETED: 'text-emerald-500',
  VERIFIED: 'text-violet-500',
  FAILED: 'text-red-500',
  SCANNING: 'text-blue-500',
  PENDING: 'text-amber-500',
};

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<GeneratedReport | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const auditsQuery = useQuery({ queryKey: ['report-audits'], queryFn: fetchAudits });
  const reportsQuery = useQuery({ queryKey: ['reports'], queryFn: fetchReports });
  const generateMutation = useMutation({
    mutationFn: ({
      auditId,
      format,
      includeAiSummary,
    }: {
      auditId: string;
      format: ReportFormat;
      includeAiSummary: boolean;
    }) => generateReport(auditId, format, includeAiSummary),
    onSuccess: (report) => {
      setPreview(report);
      toast.success(`${report.format} report generated`);
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  function handleGenerate(auditId: string, format: ReportFormat, includeAiSummary: boolean) {
    generateMutation.mutate({ auditId, format, includeAiSummary });
  }

  function generateHistoryReport(report: ReportHistoryItem, format: ReportFormat) {
    generateMutation.mutate({ auditId: report.auditId, format, includeAiSummary: true });
  }

  const history = reportsQuery.data ?? [];
  const error = auditsQuery.error ?? reportsQuery.error ?? generateMutation.error;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-primary text-sm font-semibold uppercase tracking-wider">
          Security center
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-1">
          Generate, preview, and download audit reports in the format your team needs.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <ReportGeneratorForm
          audits={auditsQuery.data?.data ?? []}
          isLoading={generateMutation.isPending || auditsQuery.isLoading}
          error={error instanceof Error ? error.message : null}
          onGenerate={handleGenerate}
        />
        {preview ? (
          <ReportPreview report={preview} />
        ) : (
          <div className="bg-card flex min-h-[28rem] flex-col items-center justify-center rounded-xl border px-8 text-center shadow-sm">
            <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-2xl">
              <FileText className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Your preview will appear here</h2>
            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
              Select an audit and format to inspect the generated report before downloading it.
            </p>
          </div>
        )}
      </div>

      <section className="bg-card rounded-xl border shadow-sm">
        <div className="flex flex-col gap-3 border-b px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Report history</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Previously generated reports are kept with their audit.
            </p>
          </div>
          {reportsQuery.isError && (
            <button
              type="button"
              onClick={() => void reportsQuery.refetch()}
              className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Try again
            </button>
          )}
        </div>

        {reportsQuery.isLoading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3].map((item) => (
              <div key={item} className="bg-muted h-16 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : reportsQuery.isError ? (
          <div className="text-muted-foreground px-6 py-14 text-center text-sm">
            Report history is temporarily unavailable.
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <Clock3 className="text-muted-foreground/40 h-10 w-10" />
            <p className="mt-3 text-sm font-medium">No reports generated yet</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Your generated reports will show up here.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {history.map((report) => {
              const expanded = expandedId === report.id;
              return (
                <div key={report.id} className="hover:bg-muted/20 transition-colors">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : report.id)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{report.projectName}</p>
                        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-3 text-xs">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(report.auditDate).toLocaleDateString()}
                          </span>
                          <span>{report.findings} findings</span>
                          {report.securityScore !== null && <span>{report.securityScore}/100</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={`hidden items-center gap-1 text-xs sm:inline-flex ${statusColors[report.status] ?? 'text-muted-foreground'}`}
                      >
                        {report.status === 'VERIFIED' && <ShieldCheck className="h-3.5 w-3.5" />}
                        {report.status}
                      </span>
                      <ChevronDown
                        className={`text-muted-foreground h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>
                  {expanded && (
                    <div className="bg-muted/10 border-t px-6 py-4">
                      <div className="grid gap-4 text-xs sm:grid-cols-2">
                        <div>
                          <p className="text-muted-foreground font-medium">Audit</p>
                          <Link
                            href={`/dashboard/audits/${report.auditId}`}
                            className="text-primary mt-1 inline-block font-mono hover:underline"
                          >
                            {report.auditId}
                          </Link>
                        </div>
                        <div>
                          <p className="text-muted-foreground font-medium">Report hash</p>
                          <p className="mt-1 break-all font-mono">
                            {report.reportHash ?? 'Pending'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {report.formats.map((format) => (
                          <button
                            key={format}
                            type="button"
                            onClick={() => generateHistoryReport(report, format)}
                            disabled={generateMutation.isPending}
                            className="hover:bg-muted rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                          >
                            Download {format}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
