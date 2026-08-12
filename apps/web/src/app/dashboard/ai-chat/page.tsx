'use client';

import { AlertCircle, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { type AuditOption, ChatContext } from '@/components/ai-chat/chat-context';
import { ChatInput } from '@/components/ai-chat/chat-input';
import { type ChatMessage, ChatMessages } from '@/components/ai-chat/chat-messages';

interface Citation {
  findingId?: string;
  lineStart?: number;
  lineEnd?: number;
}

interface ApiChatResponse {
  success: boolean;
  data: {
    message: string;
    citations: Citation[];
  };
  message?: string;
}

export default function AiChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audits, setAudits] = useState<AuditOption[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState('');
  const [loadingAudits, setLoadingAudits] = useState(true);

  // Fetch available audits for context
  useEffect(() => {
    async function fetchAudits() {
      try {
        const token = getAuthToken();
        if (!token) {
          setLoadingAudits(false);
          return;
        }

        const res = await fetch(`${getApiBaseUrl()}/api/v1/audits?limit=50&sortOrder=desc`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch audits: ${res.status}`);
        }

        const json = (await res.json()) as {
          success: boolean;
          data?: {
            data?: Array<{
              id: string;
              status: string;
              securityScore: number | null;
              project?: { name: string };
            }>;
          };
        };
        if (json.success && json.data?.data) {
          const auditOptions: AuditOption[] = json.data.data.map((audit) => ({
            id: audit.id,
            name: audit.project?.name ?? `Audit ${audit.id.slice(0, 8)}`,
            status: audit.status,
            securityScore: audit.securityScore,
          }));
          setAudits(auditOptions);

          // Auto-select the most recent completed audit
          const completed = auditOptions.find((a) => a.status === 'COMPLETED');
          if (completed) {
            setSelectedAuditId(completed.id);
            setMessages([
              {
                id: 'welcome',
                role: 'assistant',
                content: `I'm ready to help you analyze the "${completed.name}" audit. Ask me about its findings, how to fix vulnerabilities, or anything about smart contract security.`,
                timestamp: new Date(),
              },
            ]);
          } else if (auditOptions.length > 0) {
            const first = auditOptions[0];
            if (!first) return;
            setSelectedAuditId(first.id);
            setMessages([
              {
                id: 'welcome',
                role: 'assistant',
                content: `I'm your Veridion AI security assistant. I see you have the "${first.name}" audit (${first.status}). Ask me anything about smart contract security!`,
                timestamp: new Date(),
              },
            ]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch audits:', err);
      } finally {
        setLoadingAudits(false);
      }
    }

    void fetchAudits();
  }, []);

  // Reset messages when switching audits
  const handleSelectAudit = useCallback(
    (auditId: string) => {
      if (auditId === selectedAuditId) return;
      setSelectedAuditId(auditId);
      setMessages([]);
      setError(null);

      const audit = audits.find((a) => a.id === auditId);
      if (audit) {
        setMessages([
          {
            id: `switch-${Date.now()}`,
            role: 'assistant',
            content: `Switched to audit: **${audit.name}** (${audit.status}${audit.securityScore !== null ? ` · Score: ${audit.securityScore}/100` : ''}). How can I help you with this audit?`,
            timestamp: new Date(),
          },
        ]);
      }
    },
    [audits, selectedAuditId],
  );

  async function clearConversation() {
    if (!selectedAuditId) return;

    try {
      const token = getAuthToken();
      if (token) {
        await fetch(`${getApiBaseUrl()}/api/v1/ai/conversation/${selectedAuditId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Silent fail — clear locally even if API call fails
    }

    setMessages([
      {
        id: `new-${Date.now()}`,
        role: 'assistant',
        content: 'Starting a new conversation. How can I help you with this audit?',
        timestamp: new Date(),
      },
    ]);
    setError(null);
  }

  async function sendMessage(content: string) {
    if (!content.trim() || loading) return;
    if (!selectedAuditId) {
      setError('Please select an audit to start chatting.');
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required. Please log in.');
      }

      const res = await fetch(`${getApiBaseUrl()}/api/v1/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          auditId: selectedAuditId,
          message: content,
        }),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => null)) as { message?: string };
        throw new Error(errorData?.message ?? `Request failed with status ${res.status}`);
      }

      const json = (await res.json()) as ApiChatResponse;

      if (!json.success || !json.data) {
        throw new Error(json.message ?? 'Unexpected API response');
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: json.data.message,
        citations: json.data.citations,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get AI response';
      setError(errorMessage);

      const errorMsg: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `⚠️ ${errorMessage}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Chat</h1>
          <p className="text-muted-foreground mt-1">
            Ask questions about your audits, vulnerabilities, and security best practices.
          </p>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 gap-6">
        <div className="bg-card flex flex-1 flex-col rounded-xl border shadow-sm">
          <ChatMessages messages={messages} loading={loading} />

          {!selectedAuditId && !loadingAudits && (
            <div className="flex flex-1 flex-col items-center justify-center p-6">
              <WifiOff className="text-muted-foreground mb-3 h-10 w-10" />
              <h3 className="text-lg font-semibold">No Audit Selected</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Select an audit from the sidebar to start a conversation with the AI assistant.
              </p>
            </div>
          )}

          <ChatInput
            onSend={(msg) => {
              void sendMessage(msg);
            }}
            loading={loading}
            placeholder={
              selectedAuditId
                ? 'Ask about vulnerabilities, fixes, or audit results...'
                : 'Select an audit to start chatting...'
            }
          />
        </div>

        <ChatContext
          audits={audits}
          selectedAuditId={selectedAuditId}
          onSelectAudit={handleSelectAudit}
          onClearConversation={() => {
            void clearConversation();
          }}
          loadingAudits={loadingAudits}
        />
      </div>
    </div>
  );
}

// ---- Helpers ----

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:4000';
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
}
