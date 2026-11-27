import { coreApi } from "@/services/api-client";
import type { ChatRequest, ChatResponse } from "@/types/chat";

/**
 * POST /api/v1/conversations/{conversationId}/chat — synchronous. The core API
 * verifies ownership, injects the stored `content_id`, and proxies to the
 * internal AI service. History is fetched server-side by `conversation_id`;
 * `max_story_order` is the live spoiler boundary applied per call.
 */
export function sendChatMessage(
  conversationId: string,
  request: ChatRequest,
  signal?: AbortSignal,
): Promise<ChatResponse> {
  return coreApi.post<ChatResponse>(
    `/v1/conversations/${conversationId}/chat`,
    request,
    signal,
  );
}
