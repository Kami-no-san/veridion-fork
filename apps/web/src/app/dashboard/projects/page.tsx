'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderOpen, Plus, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { ProjectCard } from '@/components/projects/project-card';
import { deleteProject, fetchProjects, type ProjectListItem } from '@/lib/api-client';

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const projectsQuery = useQuery({
    queryKey: ['projects', page, search],
    queryFn: () => fetchProjects(page, search),
  });
  const deleteMutation = useMutation({
    mutationFn: (project: ProjectListItem) => deleteProject(project.id),
    onSuccess: (_, project) => {
      toast.success(`${project.name} deleted`);
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to delete project'),
  });

  const projects = projectsQuery.data?.data ?? [];
  const meta = projectsQuery.data?.meta;

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleDelete(project: ProjectListItem) {
    if (window.confirm(`Delete "${project.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(project);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-primary text-sm font-semibold uppercase tracking-wider">Workspace</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage smart contract projects and track their security posture.
          </p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> New project
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="relative w-full sm:max-w-sm">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search projects..."
            aria-label="Search projects"
            className="bg-background placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2"
          />
        </form>
        {meta && (
          <p className="text-muted-foreground text-sm">
            {meta.total} project{meta.total === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {projectsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-card h-64 animate-pulse rounded-xl border" />
          ))}
        </div>
      ) : projectsQuery.isError ? (
        <div className="bg-card flex flex-col items-center justify-center rounded-xl border px-6 py-16 text-center">
          <FolderOpen className="text-muted-foreground/40 h-12 w-12" />
          <h2 className="mt-4 font-semibold">Could not load projects</h2>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            Check your connection and try again. Your projects are safe.
          </p>
          <button
            type="button"
            onClick={() => void projectsQuery.refetch()}
            className="text-primary mt-4 inline-flex items-center gap-2 text-sm font-medium hover:underline"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-card flex flex-col items-center justify-center rounded-xl border px-6 py-16 text-center">
          <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-2xl">
            <FolderOpen className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">
            {search ? 'No matching projects' : 'Your workspace is empty'}
          </h2>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            {search
              ? 'Try a different search term.'
              : 'Create your first project to start auditing smart contracts.'}
          </p>
          {!search && (
            <Link
              href="/dashboard/projects/new"
              className="bg-primary text-primary-foreground hover:bg-primary/90 mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" /> Create project
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onDelete={handleDelete} />
            ))}
          </div>
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <button
                type="button"
                disabled={!meta.hasPreviousPage}
                onClick={() => setPage((current) => current - 1)}
                className="hover:bg-muted rounded-lg border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-muted-foreground text-sm">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                type="button"
                disabled={!meta.hasNextPage}
                onClick={() => setPage((current) => current + 1)}
                className="hover:bg-muted inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
