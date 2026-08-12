const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const ACCESS_TOKEN_KEY = 'veridion_access_token';

export interface ApiError {
  message?: string | string[];
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export function storeAccessToken(token: string): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  if (typeof window !== 'undefined') window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getErrorMessage(payload: ApiError): string {
  if (Array.isArray(payload.message)) return payload.message.join(', ');
  return payload.message ?? 'Request failed';
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  const payload = (await response.json().catch(() => null)) as T | ApiError | null;

  if (!response.ok) {
    throw new ApiRequestError(
      payload && typeof payload === 'object'
        ? getErrorMessage(payload as ApiError)
        : 'Request failed',
      response.status,
    );
  }

  return payload as T;
}

export interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  repoUrl: string | null;
  chain: string;
  language: string;
  contractCount: number;
  createdAt: string;
  updatedAt: string;
  _count?: { audits: number; contracts: number };
}

export interface ProjectDetails extends ProjectListItem {
  contracts: Array<{
    id: string;
    name: string;
    filePath: string;
    language: string;
    hash: string;
    lineCount: number;
    updatedAt: string;
  }>;
  audits: Array<{
    id: string;
    status: string;
    securityScore: number | null;
    createdAt: string;
    _count: { findings: number };
  }>;
}

export interface PaginatedProjects {
  data: ProjectListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface ProjectInput {
  name: string;
  description?: string;
  repoUrl?: string;
  chain: string;
  language: string;
}

export async function fetchProjects(page = 1, search = ''): Promise<PaginatedProjects> {
  const params = new URLSearchParams({ page: String(page), limit: '9' });
  if (search.trim()) params.set('search', search.trim());
  return apiFetch<PaginatedProjects>(`/projects?${params.toString()}`);
}

export function fetchProject(id: string): Promise<ProjectDetails> {
  return apiFetch<ProjectDetails>(`/projects/${id}`);
}

export function createProject(input: ProjectInput): Promise<ProjectListItem> {
  return apiFetch<ProjectListItem>('/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateProject(id: string, input: Partial<ProjectInput>): Promise<ProjectListItem> {
  return apiFetch<ProjectListItem>(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteProject(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/projects/${id}`, { method: 'DELETE' });
}
