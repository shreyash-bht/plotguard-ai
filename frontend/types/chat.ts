/** Chat contracts. Requests go through the core API; the AI service is internal. */

/**
 * Request body of `POST /api/v1/conversations/{conversationId}/chat`.
 * `conversation_id` and `content_id` are resolved server-side and are not
 * accepted from the client.
 */
export interface ChatRequest {
  user_question: string;
  max_story_order: number;
  is_send_metadata?: boolean;
  /** `null`/omitted means "use the service's configured default". */
  enable_reranking?: boolean | null;
}

export interface RetrievedChunk {
  chunk_id: string;
  chunk_index: number;
  chunk_text: string;
  story_order: number;
  distance: number;
  rerank_score: number | null;
}

export interface ChatMetadata {
  contextualized_query: string;
  generation_time_seconds: number;
  token_usage: unknown;
  used_chunks: RetrievedChunk[];
}

/** Response of the chat endpoint. `answer` is LLM text (not streamed). */
export interface ChatResponse {
  answer: string;
  chat_metadata: ChatMetadata | null;
}
