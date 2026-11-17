"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import { formatTime } from "@/lib/format";
import {
  deleteConversation,
  listConversations,
  fetchShowTitle,
} from "@/services/conversations";
import { useConversationStore } from "@/stores/conversations";
import { useSessionStore } from "@/stores/session";
import type { CoreConversation } from "@/types/conversation";

interface SidebarItem {
  conversationId: string;
  title: string;
  /** Present once the local display cache knows this conversation. */
  boundaryLabel: string | null;
  lastActiveAt: string;
}

/**
 * Recent conversations, hydrated from the backend (`GET
 * /api/conversations/user/{userId}`), with display titles merged from the
 * local cache and fetched on demand for conversations created elsewhere.
 */
export function SidebarConversations({ onNavigate }: { onNavigate?: () => void }) {
  const user = useSessionStore((s) => s.user);
  const refMap = useConversationStore((s) => s.map);
  const deletedIds = useConversationStore((s) => s.deletedIds);
  // Every create/update/delete elsewhere bumps this; the effect below
  // refetches so both mounted sidebar instances stay current without a reload.
  const revision = useConversationStore((s) => s.revision);
  const router = useRouter();
  const [conversations, setConversations] = useState<CoreConversation[] | null>(null);
  const [titleById, setTitleById] = useState<Record<string, string>>({});
  /** Conversation id with the inline delete confirmation open. */
  const [confirmId, setConfirmId] = useState<string | null>(null);
  /** Conversation id whose delete request is in flight. */
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const controller = new AbortController();
    // Deferred: kicks off async loading outside the effect's synchronous pass
    // (React lint: no cascading setState in effects).
    queueMicrotask(() => {
      void listConversations(user.userId, controller.signal)
        .then(async (list) => {
          if (!alive) return;
          setConversations(list);
          // Titles for conversations with no local ref: fetch lazily.
          const missing = list.filter(
            (conversation) =>
              !refMap[conversation.conversationId]?.showTitle &&
              titleById[conversation.contentId] === undefined,
          );
          const fetched = await Promise.all(
            missing.map(async (conversation) => {
              const title = await fetchShowTitle(
                conversation.contentId,
                controller.signal,
              ).catch(() => null);
              return [conversation.contentId, title] as const;
            }),
          );
          if (!alive) return;
          setTitleById((prev) => {
            const next = { ...prev };
            let changed = false;
            for (const [contentId, title] of fetched) {
              if (title && next[contentId] !== title) {
                next[contentId] = title;
                changed = true;
              }
            }
            return changed ? next : prev;
          });
        })
        .catch(() => {
          if (alive && !controller.signal.aborted) setConversations([]);
        });
    });
    return () => {
      alive = false;
      controller.abort();
    };
    // The server list is the snapshot; local map/title merges are display-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.userId, revision]);

  const handleConfirmDelete = async (conversationId: string) => {
    if (!user || deletingId) return;
    setDeletingId(conversationId);
    setDeleteError(null);
    try {
      // The service marks the conversation deleted in the shared store, which
      // filters it out of this list and every other mounted sidebar instance.
      await deleteConversation(conversationId, user.userId);
      setConfirmId(null);
      // The deleted conversation may be the one currently open — leave it.
      // Read synchronously here instead of usePathname(): a URL-data hook in
      // this layout component blocks prerendering of /chat/[conversationId].
      if (window.location.pathname === `/chat/${conversationId}`) {
        router.push("/select");
      }
    } catch {
      setDeleteError("Could not delete the conversation. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const visible: SidebarItem[] | null =
    conversations === null
      ? null
      : conversations
          .filter((conversation) => !deletedIds[conversation.conversationId])
          .map((conversation) => {
            const ref = refMap[conversation.conversationId];
            return {
              conversationId: conversation.conversationId,
              title:
                ref?.showTitle ??
                titleById[conversation.contentId] ??
                "Untitled show",
              boundaryLabel: ref?.boundaryLabel ?? null,
              // Server updated_at is the freshest activity signal (chats bump
              // it), so it wins over the locally cached timestamp.
              lastActiveAt: conversation.updatedAt,
            };
          });

  return (
    <div className="px-3 pt-4">
      <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-wider text-faint">
        Recent
      </p>
      {visible === null ? (
        <div className="space-y-0.5 pb-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-raise" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="px-2 pb-3 text-[12px] leading-relaxed text-faint">
          No conversations yet. Pick a show to start one.
        </p>
      ) : (
        <ul className="space-y-0.5 pb-3">
          {visible.map((item) => (
            <li key={item.conversationId} className="group">
              {confirmId === item.conversationId ? (
                <div className="rounded-lg bg-raise px-2 py-1.5">
                  <p className="truncate text-[12px] text-mute">
                    Delete &ldquo;{item.title}&rdquo; and all its messages?
                  </p>
                  {deleteError ? (
                    <p className="mt-1 text-[11px] text-danger">{deleteError}</p>
                  ) : null}
                  <div className="mt-1.5 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void handleConfirmDelete(item.conversationId)}
                      disabled={deletingId === item.conversationId}
                      className="rounded-md bg-danger/15 px-2 py-1 text-[11px] font-medium text-danger transition-colors hover:bg-danger/25 disabled:opacity-60"
                    >
                      {deletingId === item.conversationId ? "Deleting…" : "Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmId(null);
                        setDeleteError(null);
                      }}
                      className="rounded-md px-2 py-1 text-[11px] text-faint transition-colors hover:bg-hover/60 hover:text-mute"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <Link
                    href={`/chat/${item.conversationId}`}
                    onClick={onNavigate}
                    className="block min-w-0 flex-1 rounded-lg px-2 py-1.5 transition-colors hover:bg-hover/60"
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate text-[13px] text-mute">
                        {item.title}
                      </span>
                      <span className="shrink-0 text-[10px] text-faint">
                        {formatTime(item.lastActiveAt)}
                      </span>
                    </span>
                    {item.boundaryLabel ? (
                      <span className="mt-0.5 block truncate text-[11px] text-accent/80">
                        {item.boundaryLabel}
                      </span>
                    ) : null}
                  </Link>
                  <button
                    type="button"
                    aria-label={`Delete ${item.title} conversation`}
                    onClick={() => {
                      setConfirmId(item.conversationId);
                      setDeleteError(null);
                    }}
                    className="shrink-0 rounded-md p-1.5 text-faint/70 transition-colors hover:bg-hover/60 hover:text-danger focus-visible:text-danger"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
