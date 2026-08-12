'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCode2,
  Github,
  Pencil,
  Play,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { ProjectForm } from '@/components/projects/project-form';
import { deleteProject, fetchProject, type ProjectDetails, updateProject } from '@/lib/api-client';

const statusStyles: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  COMPLETED: { icon: CheckCircle2, color: 'text-emerald-500' },
  VERIFIED: { icon: Shield, color: 'text-violet-500' },
  SCANNING: { icon: Clock, color: 'text-blue-500' },
  PENDING: { icon: Clock, color: 'text-amber-500' },
  FAILED: { icon: AlertTriangle, color: 'text-red-500' },
};

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const projectId = params.id;
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true');
  const [formError, setFormError] = useState<string | null>(null);
  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId),
    enabled: Boolean(projectId),
  });
  const updateMutation = useMutation({
    mutationFn: (input: { name?: string; description?: string; repoUrl?: string }) =>
      updateProject(projectId, input),
    onSuccess: () => {
      toast.success('Project updated');
      setIsEditing(false);
      void queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error: Error) => setFormError(error.message || 'Failed to update project'),
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteProject(projectId),
    onSuccess: () => {
      toast.success('Project deleted');
      router.push('/dashboard/projects');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to delete project'),
  });

  function handleDelete() {
    if (
      projectQuery.data &&
      window.confirm(`Delete "${projectQuery.data.name}"? This cannot be undone.`)
    ) {
      deleteMutation.mutate();
    }
  }

  if (projectQuery.isLoading) {
    return <div className="bg-card h-96 animate-pulse rounded-xl border" />;
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <div className="bg-card flex flex-col items-center justify-center rounded-xl border px-6 py-20 text-center">
        <AlertTriangle className="text-destructive h-10 w-10" />
        <h1 className="mt-4 text-lg font-semibold">Project unavailable</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          We could not find this project or load it from the API.
        </p>
        <Link
          href="/dashboard/projects"
          className="text-primary mt-4 text-sm font-medium hover:underline"
        >
          Back to projects
        </Link>
      </div>
    );
  }

  const project: ProjectDetails = projectQuery.data;
  const scoredAudits = project.audits.filter((audit) => audit.securityScore !== null);
  const averageScore = scoredAudits.length
    ? Math.round(
        scoredAudits.reduce((sum, audit) => sum + (audit.securityScore ?? 0), 0) /
          scoredAudits.length,
      )
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Link
          href="/dashboard/projects"
          className="text-muted-foreground hover:bg-muted hover:text-foreground self-start rounded-lg p-2 transition-colors"
          aria-label="Back to projects"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-bold">
              {project.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-bold tracking-tight">{project.name}</h1>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {project.chain} · {project.language}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setIsEditing((editing) => !editing);
            }}
            className="hover:bg-muted inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
          >
            {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            {isEditing ? 'Close' : 'Edit'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="text-destructive hover:bg-destructive/10 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
          <Link
            href={`/dashboard/audits?projectId=${project.id}`}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          >
            <Play className="h-4 w-4" /> New audit
          </Link>
        </div>
      </div>

      {isEditing && (
        <div className="bg-card rounded-xl border p-6 shadow-sm sm:p-8">
          <div className="mb-5 flex items-center gap-2 border-b pb-4">
            <Pencil className="text-primary h-4 w-4" />
            <h2 className="font-semibold">Edit project</h2>
          </div>
          <ProjectForm
            mode="edit"
            initialValues={{
              name: project.name,
              description: project.description ?? undefined,
              repoUrl: project.repoUrl ?? undefined,
              chain: project.chain,
              language: project.language,
            }}
            isSubmitting={updateMutation.isPending}
            serverError={formError}
            onSubmit={(values) => {
              setFormError(null);
              updateMutation.mutate({
                name: values.name,
                description: values.description || undefined,
                repoUrl: values.repoUrl || undefined,
              });
            }}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      )}

      <div className="bg-card rounded-xl border p-6 shadow-sm">
        {project.description && <p className="leading-relaxed">{project.description}</p>}
        {project.repoUrl ? (
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary mt-3 inline-flex items-center gap-1.5 text-sm hover:underline"
          >
            <Github className="h-4 w-4" /> {project.repoUrl.replace('https://github.com/', '')}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <p className="text-muted-foreground text-sm">No repository linked.</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Security score',
            value: averageScore === null ? '—' : `${averageScore}/100`,
            color: 'text-emerald-500',
          },
          {
            label: 'Contracts',
            value: project._count?.contracts ?? project.contractCount,
            color: 'text-blue-500',
          },
          {
            label: 'Audits',
            value: project._count?.audits ?? project.audits.length,
            color: 'text-violet-500',
          },
          {
            label: 'Created',
            value: new Intl.DateTimeFormat('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }).format(new Date(project.createdAt)),
            color: 'text-muted-foreground',
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border p-4 shadow-sm">
            <p className="text-muted-foreground text-xs font-medium">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-card rounded-xl border shadow-sm">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h2 className="font-semibold">Contracts</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Source files linked to this project
              </p>
            </div>
          </div>
          {project.contracts.length ? (
            <div className="divide-y">
              {project.contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between gap-3 px-6 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FileCode2 className="text-muted-foreground h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{contract.name}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {contract.filePath} · {contract.lineCount} lines
                      </p>
                    </div>
                  </div>
                  <code className="text-muted-foreground hidden shrink-0 text-xs sm:block">
                    {contract.hash.slice(0, 10)}…
                  </code>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground px-6 py-10 text-center text-sm">
              No contracts added yet.
            </div>
          )}
        </section>

        <section className="bg-card rounded-xl border shadow-sm">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h2 className="font-semibold">Audits</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">Latest security assessments</p>
            </div>
            <Link
              href={`/dashboard/audits?projectId=${project.id}`}
              className="text-primary text-sm hover:underline"
            >
              View all
            </Link>
          </div>
          {project.audits.length ? (
            <div className="divide-y">
              {project.audits.map((audit) => {
                const status = statusStyles[audit.status] ?? {
                  icon: Clock,
                  color: 'text-muted-foreground',
                };
                const Icon = status.icon;
                return (
                  <Link
                    key={audit.id}
                    href={`/dashboard/audits/${audit.id}`}
                    className="hover:bg-muted/50 flex items-center justify-between gap-3 px-6 py-3 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${status.color}`} />
                      <div>
                        <p className={`text-sm font-medium ${status.color}`}>{audit.status}</p>
                        <p className="text-muted-foreground text-xs">
                          {audit._count.findings} findings
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">
                      {audit.securityScore === null ? '—' : `${audit.securityScore}/100`}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-muted-foreground px-6 py-10 text-center text-sm">
              No audits yet.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
