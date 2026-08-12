'use client';

import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, FolderPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { ProjectForm } from '@/components/projects/project-form';
import { createProject, type ProjectInput } from '@/lib/api-client';

export default function NewProjectPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (input: ProjectInput) => createProject(input),
    onSuccess: (project) => {
      toast.success('Project created successfully');
      router.push(`/dashboard/projects/${project.id}`);
    },
    onError: (requestError: Error) => setError(requestError.message || 'Failed to create project'),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start gap-4">
        <Link
          href="/dashboard/projects"
          className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-2 transition-colors"
          aria-label="Back to projects"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-primary text-sm font-semibold uppercase tracking-wider">Projects</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Create a project</h1>
          <p className="text-muted-foreground mt-1">
            Add the details we need to organize your next smart contract audit.
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl border p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-start gap-3 border-b pb-6">
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <FolderPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Project details</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              You can add contracts and run audits after creating the project.
            </p>
          </div>
        </div>
        <ProjectForm
          isSubmitting={mutation.isPending}
          serverError={error}
          onSubmit={(values) => {
            setError(null);
            mutation.mutate({
              ...values,
              description: values.description || undefined,
              repoUrl: values.repoUrl || undefined,
            });
          }}
          onCancel={() => router.push('/dashboard/projects')}
        />
      </div>
    </div>
  );
}
