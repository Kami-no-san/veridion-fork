const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const ACCESS_TOKEN_KEY = 'veridion_access_token';

export function storeAccessToken(token: string): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

interface ApiErrorPayload {
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

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getAccessToken();
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const payload = (await response.json().catch(() => null)) as T | ApiErrorPayload | null;
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' ? (payload as ApiErrorPayload).message : undefined;
    throw new ApiRequestError(
      Array.isArray(message) ? message.join(', ') : (message ?? 'Request failed'),
      response.status,
    );
  }
  return payload as T;
}

export type ReportFormat = 'JSON' | 'MARKDOWN' | 'HTML' | 'PDF';

export interface ReportHistoryItem {
  id: string;
  auditId: string;
  projectName: string;
  auditDate: string;
  securityScore: number | null;
  findings: number;
  status: string;
  generatedAt: string;
  reportHash: string | null;
  formats: ReportFormat[];
}

export interface GeneratedReport extends ReportHistoryItem {
  format: ReportFormat;
  content: string;
  contentType: string;
  fileExtension: string;
}

export interface AuditOption {
  id: string;
  project: { name: string };
  status: string;
  createdAt: string;
}

export function fetchReports(): Promise<ReportHistoryItem[]> {
  return apiFetch<ReportHistoryItem[]>('/reports');
}

export function fetchAudits(): Promise<{ data: AuditOption[] }> {
  return apiFetch<{ data: AuditOption[] }>('/audits?limit=100');
}

export function generateReport(
  auditId: string,
  format: ReportFormat,
  includeAiSummary: boolean,
): Promise<GeneratedReport> {
  return apiFetch<GeneratedReport>('/reports/generate', {
    method: 'POST',
    body: JSON.stringify({ auditId, format, includeAiSummary }),
  });
}
