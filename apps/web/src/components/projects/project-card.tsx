'use client';

import { ExternalLink, FileCode2, MoreHorizontal, Pencil, Shield, Trash2 } from 'lucide-react';
import Link from 'next/link';

import type { ProjectListItem } from '@/lib/api-client';

interface ProjectCardProps {
  project: ProjectListItem;
  onDelete: (project: ProjectListItem) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const auditCount = project._count?.audits ?? 0;
  const contractCount = project._count?.contracts ?? project.contractCount;

  return (
    <article className="bg-card hover:border-primary/40 group flex h-full flex-col rounded-xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/dashboard/projects/${project.id}`}
          className="flex min-w-0 items-center gap-3"
        >
          <div className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold">
            {project.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="group-hover:text-primary truncate font-semibold">{project.name}</h2>
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {project.chain} · {project.language}
            </p>
          </div>
        </Link>
        <div className="relative">
          <details className="group/menu">
            <summary className="text-muted-foreground hover:bg-muted inline-flex cursor-pointer list-none rounded-md p-1.5 transition-colors [&::-webkit-details-marker]:hidden">
              <MoreHorizontal className="h-4 w-4" />
            </summary>
            <div className="bg-popover absolute right-0 z-10 mt-1 w-36 rounded-lg border p-1 shadow-lg">
              <Link
                href={`/dashboard/projects/${project.id}?edit=true`}
                className="hover:bg-muted flex items-center gap-2 rounded-md px-2.5 py-2 text-xs"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Link>
              <button
                type="button"
                onClick={() => onDelete(project)}
                className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </details>
        </div>
      </div>

      <p className="text-muted-foreground mt-4 line-clamp-2 min-h-10 text-sm">
        {project.description || 'No description added yet.'}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="bg-muted/40 rounded-lg p-2.5">
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <FileCode2 className="h-3.5 w-3.5" /> Contracts
          </div>
          <p className="mt-1 text-lg font-semibold">{contractCount}</p>
        </div>
        <div className="bg-muted/40 rounded-lg p-2.5">
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Shield className="h-3.5 w-3.5" /> Audits
          </div>
          <p className="mt-1 text-lg font-semibold">{auditCount}</p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-xs">
        <span className="text-muted-foreground">
          Updated{' '}
          {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
            new Date(project.updatedAt),
          )}
        </span>
        {project.repoUrl && (
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            aria-label={`Open ${project.name} repository`}
          >
            Repo <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </article>
  );
}
