'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  type CreateProjectDto,
  createProjectSchema,
  SUPPORTED_CHAINS,
  SUPPORTED_LANGUAGES,
} from '@veridion/shared';
import { Loader2, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';

interface ProjectFormProps {
  mode?: 'create' | 'edit';
  initialValues?: Partial<CreateProjectDto>;
  isSubmitting?: boolean;
  serverError?: string | null;
  onSubmit: (values: CreateProjectDto) => Promise<void> | void;
  onCancel?: () => void;
}

export function ProjectForm({
  mode = 'create',
  initialValues,
  isSubmitting = false,
  serverError,
  onSubmit,
  onCancel,
}: ProjectFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateProjectDto>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: initialValues?.name ?? '',
      description: initialValues?.description ?? '',
      repoUrl: initialValues?.repoUrl ?? '',
      chain: initialValues?.chain ?? '',
      language: initialValues?.language ?? '',
    },
  });

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
      className="space-y-5"
      noValidate
    >
      {serverError && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-3 text-sm"
        >
          {serverError}
        </div>
      )}

      <div>
        <label htmlFor="project-name" className="text-sm font-medium">
          Project name <span className="text-destructive">*</span>
        </label>
        <input
          id="project-name"
          type="text"
          maxLength={100}
          placeholder="e.g. DeFi Protocol v2"
          className="bg-background placeholder:text-muted-foreground focus:ring-ring mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
          {...register('name')}
        />
        {errors.name && <p className="text-destructive mt-1 text-xs">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="project-description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="project-description"
          rows={3}
          maxLength={500}
          placeholder="What does this project do?"
          className="bg-background placeholder:text-muted-foreground focus:ring-ring mt-1.5 w-full resize-none rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
          {...register('description')}
        />
        {errors.description ? (
          <p className="text-destructive mt-1 text-xs">{errors.description.message}</p>
        ) : (
          <p className="text-muted-foreground mt-1 text-xs">Up to 500 characters</p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="project-chain" className="text-sm font-medium">
            Blockchain <span className="text-destructive">*</span>
          </label>
          <select
            id="project-chain"
            className="bg-background focus:ring-ring mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
            {...register('chain')}
          >
            <option value="">Select a chain</option>
            {SUPPORTED_CHAINS.map((chain) => (
              <option key={chain} value={chain}>
                {chain.charAt(0).toUpperCase() + chain.slice(1)}
              </option>
            ))}
          </select>
          {errors.chain && <p className="text-destructive mt-1 text-xs">{errors.chain.message}</p>}
        </div>

        <div>
          <label htmlFor="project-language" className="text-sm font-medium">
            Language <span className="text-destructive">*</span>
          </label>
          <select
            id="project-language"
            className="bg-background focus:ring-ring mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
            {...register('language')}
          >
            <option value="">Select a language</option>
            {SUPPORTED_LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {language.charAt(0).toUpperCase() + language.slice(1)}
              </option>
            ))}
          </select>
          {errors.language && (
            <p className="text-destructive mt-1 text-xs">{errors.language.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="project-repo" className="text-sm font-medium">
          Repository URL
        </label>
        <input
          id="project-repo"
          type="url"
          placeholder="https://github.com/your-org/your-repo"
          className="bg-background placeholder:text-muted-foreground focus:ring-ring mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
          {...register('repoUrl')}
        />
        {errors.repoUrl && (
          <p className="text-destructive mt-1 text-xs">{errors.repoUrl.message}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Create project'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="hover:bg-muted inline-flex items-center rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
