'use client';

import { Bot, ExternalLink, FileCode, User } from 'lucide-react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  timestamp: Date;
}

interface Citation {
  findingId?: string;
  lineStart?: number;
  lineEnd?: number;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  loading: boolean;
}

export function ChatMessages({ messages, loading }: ChatMessagesProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
            <Bot className="text-primary h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold">AI Security Assistant</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            Select an audit and ask me anything about your smart contract vulnerabilities, fixes, or
            security best practices.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-6">
      {messages.map((msg) => (
        <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              msg.role === 'assistant'
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {msg.role === 'assistant' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
          </div>
          <div
            className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'assistant' ? 'bg-muted/50' : 'bg-primary text-primary-foreground'
            }`}
          >
            <div className="whitespace-pre-wrap">
              {/* Render content with clickable finding citations */}
              {msg.role === 'assistant'
                ? renderContent(msg.content, msg.citations)
                : renderContent(msg.content)}
            </div>

            {/* Citation badges */}
            {msg.citations && msg.citations.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {msg.citations.map((citation, idx) => (
                  <a
                    key={idx}
                    href={`#finding-${citation.findingId}`}
                    className="bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors"
                  >
                    <FileCode className="h-3 w-3" />
                    Finding {citation.findingId ? citation.findingId.slice(0, 8) : ''}
                    {citation.lineStart && <> :{citation.lineStart}</>}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ))}
              </div>
            )}

            <p
              className={`mt-1 text-xs ${
                msg.role === 'assistant' ? 'text-muted-foreground' : 'text-primary-foreground/70'
              }`}
            >
              {msg.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      ))}

      {loading && (
        <div className="flex gap-3">
          <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
            <Bot className="h-4 w-4" />
          </div>
          <div className="bg-muted/50 rounded-xl px-4 py-3">
            <div className="flex gap-1.5">
              <span className="bg-primary/60 h-2 w-2 animate-bounce rounded-full [animation-delay:0ms]" />
              <span className="bg-primary/60 h-2 w-2 animate-bounce rounded-full [animation-delay:150ms]" />
              <span className="bg-primary/60 h-2 w-2 animate-bounce rounded-full [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Renders content with inline [Finding: ...] citations converted to
 * styled badges within the text flow.
 */
/**
 * Renders content with:
 * - Inline [Finding: ...] citations converted to styled badges
 * - Code blocks (```...```) rendered in styled pre/code elements
 */
function renderContent(content: string, citations?: Citation[]): React.ReactNode {
  if (!citations || citations.length === 0) {
    return renderCodeBlocks(content);
  }

  // First, split by citation patterns and render them as badges
  const parts = content.split(/(\[Finding:\s*[^\]]+\])/gi);
  return parts.map((part, i) => {
    const match = /\[Finding:\s*([^\]]+)\]/i.exec(part);
    if (match && match[1]) {
      return (
        <span
          key={i}
          className="bg-primary/10 text-primary inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium"
        >
          <FileCode className="inline h-3 w-3" />
          {match[1].trim()}
        </span>
      );
    }
    return <span key={i}>{renderCodeBlocks(part)}</span>;
  });
}

/**
 * Detects markdown-style code blocks (```...```) and renders them
 * with styled pre/code elements.
 */
function renderCodeBlocks(text: string): React.ReactNode {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    const codeMatch = /```(\w*)\n?([\s\S]*?)```/g.exec(part);
    if (codeMatch) {
      const lang = codeMatch[1] || '';
      const code = codeMatch[2] || '';
      return (
        <pre
          key={i}
          className="bg-background/80 my-2 overflow-x-auto rounded-lg border p-3 text-xs"
        >
          {lang && (
            <div className="text-muted-foreground mb-1 text-[10px] uppercase tracking-wider">
              {lang}
            </div>
          )}
          <code className={`text-foreground/90 ${lang ? `language-${lang}` : ''}`}>
            {code.trim()}
          </code>
        </pre>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
