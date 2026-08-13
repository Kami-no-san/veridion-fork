'use client';

import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { apiGet, apiPatch } from '@/lib/api-helpers';
import { formatRelativeTime } from '@/lib/utils';

type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
type NotificationFilter = 'all' | 'unread';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

interface NotificationGroup {
  label: string;
  items: Notification[];
}

const typeConfig: Record<
  NotificationType,
  { icon: React.ElementType; color: string; bg: string; border: string }
> = {
  INFO: {
    icon: Info,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  SUCCESS: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  WARNING: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  ERROR: {
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
};

function getTypeConfig(type: string) {
  return typeConfig[type.toUpperCase() as NotificationType] ?? typeConfig.INFO;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const requestId = useRef(0);

  const loadNotifications = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const response = await apiGet<unknown>('/api/v1/notifications');
      if (!Array.isArray(response)) {
        throw new Error('Unexpected notifications response');
      }
      if (currentRequestId === requestId.current) setItems(response as Notification[]);
    } catch (err) {
      if (currentRequestId === requestId.current) {
        setError(err instanceof Error ? err.message : 'Failed to load notifications');
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const unreadCount = items.filter((notification) => !notification.read).length;
  const groups = useMemo<NotificationGroup[]>(() => {
    const visibleItems = filter === 'unread' ? items.filter((item) => !item.read) : items;
    const unread = visibleItems.filter((item) => !item.read);
    const read = visibleItems.filter((item) => item.read);

    return [
      ...(unread.length > 0 ? [{ label: 'Unread', items: unread }] : []),
      ...(read.length > 0 ? [{ label: 'Earlier', items: read }] : []),
    ];
  }, [filter, items]);

  async function markAsRead(id: string) {
    const notification = items.find((item) => item.id === id);
    if (!notification || notification.read || pendingIds.has(id)) return true;

    setPendingIds((current) => new Set(current).add(id));
    setItems((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));

    try {
      await apiPatch(`/api/v1/notifications/${id}/read`);
      return true;
    } catch (err) {
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, read: false } : item)),
      );
      toast.error(err instanceof Error ? err.message : 'Failed to mark notification as read');
      return false;
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  async function markAllAsRead() {
    const unread = items.filter((item) => !item.read);
    if (unread.length === 0) return;

    const results = await Promise.all(unread.map((item) => markAsRead(item.id)));
    if (results.every(Boolean)) toast.success('All notifications marked as read');
  }

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading notifications">
        <div>
          <div className="bg-muted h-9 w-56 animate-pulse rounded-md" />
          <div className="bg-muted mt-3 h-5 w-96 max-w-full animate-pulse rounded-md" />
        </div>
        <div className="bg-card divide-y overflow-hidden rounded-xl border">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex gap-4 px-6 py-5">
              <div className="bg-muted h-10 w-10 shrink-0 animate-pulse rounded-lg" />
              <div className="flex-1 space-y-3">
                <div className="bg-muted h-4 w-1/3 animate-pulse rounded" />
                <div className="bg-muted h-4 w-4/5 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[26rem] flex-col items-center justify-center text-center">
        <div className="bg-destructive/10 text-destructive flex h-14 w-14 items-center justify-center rounded-2xl">
          <Bell className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-xl font-semibold">Could not load notifications</h1>
        <p className="text-muted-foreground mt-2 max-w-sm text-sm">{error}</p>
        <button
          type="button"
          onClick={() => void loadNotifications()}
          className="text-primary mt-5 inline-flex items-center gap-2 text-sm font-medium hover:underline"
        >
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-primary text-sm font-semibold uppercase tracking-wider">Activity</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated on audits, findings, and platform activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="bg-muted flex rounded-lg p-1"
            role="tablist"
            aria-label="Notification filter"
          >
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'all'}
              onClick={() => setFilter('all')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'unread'}
              onClick={() => setFilter('unread')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllAsRead()}
              disabled={pendingIds.size > 0}
              className="hover:bg-muted inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pendingIds.size > 0 ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Mark all read
            </button>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="bg-card flex flex-col items-center justify-center rounded-xl border px-6 py-16 text-center">
          <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-2xl">
            <Bell className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-lg font-semibold">
            {filter === 'unread' ? 'You are all caught up' : 'No notifications yet'}
          </h2>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            {filter === 'unread'
              ? 'You have read all your notifications.'
              : "We'll let you know when there is activity on your account."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section
              key={group.label}
              aria-labelledby={`${group.label.toLowerCase()}-notifications`}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2
                  id={`${group.label.toLowerCase()}-notifications`}
                  className="text-sm font-semibold uppercase tracking-wider"
                >
                  {group.label}
                </h2>
                <span className="text-muted-foreground text-xs">
                  {group.items.length} notification{group.items.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
                <div className="divide-y">
                  {group.items.map((notification) => {
                    const config = getTypeConfig(notification.type);
                    const Icon = config.icon;
                    const isPending = pendingIds.has(notification.id);

                    return (
                      <article
                        key={notification.id}
                        className={`hover:bg-muted/50 group flex items-start gap-4 px-5 py-5 transition-colors sm:px-6 ${
                          !notification.read ? 'bg-muted/20' : ''
                        }`}
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${config.bg} ${config.border}`}
                        >
                          <Icon className={`h-5 w-5 ${config.color}`} aria-hidden="true" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="font-medium">
                                {notification.title}
                                {!notification.read && (
                                  <span
                                    className="bg-primary ml-2 inline-block h-2 w-2 rounded-full align-middle"
                                    aria-label="Unread"
                                  />
                                )}
                              </h3>
                              <p className="text-muted-foreground mt-1 text-sm leading-6">
                                {notification.message}
                              </p>
                            </div>

                            <span
                              className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs"
                              title={new Date(notification.createdAt).toLocaleString()}
                            >
                              <Clock className="h-3 w-3" aria-hidden="true" />
                              <span className="hidden sm:inline">
                                {formatRelativeTime(notification.createdAt)}
                              </span>
                              <span className="sm:hidden">
                                {formatRelativeTime(notification.createdAt, { short: true })}
                              </span>
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                            {notification.link && (
                              <Link
                                href={notification.link}
                                className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
                              >
                                View details
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                              </Link>
                            )}

                            {!notification.read && (
                              <button
                                type="button"
                                onClick={() => void markAsRead(notification.id)}
                                disabled={isPending}
                                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                                Mark as read
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="bg-card rounded-xl border p-4 text-center">
        <p className="text-muted-foreground text-sm">
          Showing {filter === 'unread' ? unreadCount : items.length} of {items.length} notifications
          {unreadCount > 0 && ` · ${unreadCount} unread`}
        </p>
      </div>
    </div>
  );
}
