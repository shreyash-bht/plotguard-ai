import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ConversationRef } from "@/types/conversation";

interface ConversationEntry {
  map: Record<string, ConversationRef>;
}

interface ConversationState extends ConversationEntry {
  /** Conversation ids deleted on this device; server lists are filtered by these. */
  deletedIds: Record<string, true>;
  /** Change signal: bumped on create/update/delete so live lists can refetch. */
  revision: number;
  save: (ref: ConversationRef) => void;
  /** Marks a conversation deleted: drops the ref, hides it, pings listeners. */
  remove: (conversationId: string) => void;
  notifyChanged: () => void;
}

/**
 * Conversation metadata (show, boundary, timestamps) per conversation id.
 * The backend stores messages server-side but exposes no "list conversations"
 * endpoint, so this is the client's index into conversations it created.
 */
export const useConversationStore = create<ConversationState>()(
  persist(
    (set) => ({
      map: {},
      deletedIds: {},
      revision: 0,
      save: (ref) => set((s) => ({ map: { ...s.map, [ref.conversation_id]: ref } })),
      remove: (conversationId) =>
        set((s) => {
          const map = { ...s.map };
          delete map[conversationId];
          return {
            map,
            deletedIds: { ...s.deletedIds, [conversationId]: true },
            revision: s.revision + 1,
          };
        }),
      notifyChanged: () => set((s) => ({ revision: s.revision + 1 })),
    }),
    {
      name: "plotguard-conversations",
      version: 1,
      // Only persisted data; the change signal is session-local.
      partialize: (s) => ({ map: s.map, deletedIds: s.deletedIds }),
    },
  ),
);

export function getConversationRef(id: string): ConversationRef | undefined {
  return useConversationStore.getState().map[id];
}
