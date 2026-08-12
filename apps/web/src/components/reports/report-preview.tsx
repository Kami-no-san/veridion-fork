'use client';

import { Check, Clipboard, Download, Eye } from 'lucide-react';
import { useState } from 'react';

import type { GeneratedReport } from '@/lib/api-client';

interface ReportPreviewProps {
  report: GeneratedReport;
}

export function ReportPreview({ report }: ReportPreviewProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(report.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function handleDownload() {
    const blob = new Blob([report.content], { type: report.contentType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `veridion-${report.auditId}.${report.fileExtension}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="bg-card overflow-hidden rounded-xl border shadow-sm">
      <div className="flex flex-col gap-3 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
            <Eye className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <h2 className="font-semibold">Report preview</h2>
            <p className="text-muted-foreground text-xs">
              {report.projectName} · {report.format}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="hover:bg-muted inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Download .{report.fileExtension}
          </button>
        </div>
      </div>

      <div className="bg-muted/20 max-h-[42rem] overflow-auto p-4 sm:p-6">
        {report.format === 'HTML' ? (
          <iframe
            title="Report HTML preview"
            srcDoc={report.content}
            sandbox=""
            className="h-[34rem] w-full rounded-lg border bg-white"
          />
        ) : (
          <pre className="bg-background overflow-x-auto whitespace-pre-wrap rounded-lg border p-5 font-mono text-xs leading-relaxed">
            {report.content}
          </pre>
        )}
      </div>
    </section>
  );
}
