# Plotguard AI — Backend Integration Notes

Facts verified directly from source code. The frontend must follow these contracts exactly.

## Backend topology

| Service | Stack | Default port | Route prefix | Reachable from browser |
|---|---|---|---|---|
| Core API (`api/`) | Spring Boot 4.1, Java 21 | 8080 | `/api/v1` | **Yes** (via Next proxy) |
| AI service (`ai-service/`) | FastAPI | 8000 | `root_path="/api/ai"`, routers `/v1` | **No — internal only** |

> The core API is the only public backend. The AI service is called only by Spring
> (network isolation). The frontend proxies `/api/core/*` to Spring and no longer
> proxies `/api/ai/*`.
> `NEXT_PUBLIC_API_BASE_URL` therefore defaults to `/api/core` and remains
> configurable for an absolute URL.

## Core API (Spring Boot, :8080)

### Auth

- `POST /api/v1/auth/guest-register` — takes an empty/insignificant body.
  Returns a bearer token plus a **sanitized user projection** (no `passwordHash`):
  ```json
  {
    "token_type": "Bearer",
    "access_token": "<jwt>",
    "expires_in": 900,
    "user": {
      "userId": "<uuid>", "username": "AzureRaven1234", "emailId": null,
      "tempUser": true, "createdAt": "<iso-instant>",
      "lastLogin": null, "status": "active",
      "roles": [{ "role_id": 3, "roleName": "ROLE_USER", "description": "User" }]
    }
  }
  ```
  - Username generated server-side (Adjective+Noun+1000–9999, e.g. "KitsuneRonin4321").
  - `expires_in` is 900 seconds (15 minutes, `security.jwt.expiration-time`).
    There is **no refresh endpoint**; on 401 the client clears the session and
    registers a new guest. A new guest is a new user, so old conversations are
    no longer accessible.
- `POST /api/v1/auth/login` uses snake_case
  `{ "user_id": "<uuid>", "password": "..." }` →
  `{ "token_type": "Bearer", "access_token": "<jwt>" }`.

### Authorization

- `/api/v1/auth/**` is public (`/auth/register/admin` still requires auth).
- `GET /api/v1/contents/**` and `GET /api/v1/story-units/**` are public.
- **All `/api/v1/conversations/**` routes require `Authorization: Bearer <jwt>`.**
- The server derives the user identity exclusively from the token `sub`. Client
  payloads must not (and cannot) supply `user_id`.
- Missing/invalid/expired token → **401** `{ "error": "..." }`.
- A conversation that does not exist **or belongs to another user** → **404**
  (existence is not confirmed).

### Content / seasons / story units (all GET endpoints are public, no pagination)

- `GET /api/v1/contents` → `Content[]`:
  `{ contentId, title, description, contentType: "ANIME" | "TV_SHOW" | "MOVIE", releaseDate: "yyyy-MM-dd", createdAt, updatedAt }`
  - ⚠️ **No poster/artwork field exists on `Content`.**
- `GET /api/v1/contents/{contentId}` → single `Content` (unknown id → 404).
- `GET /api/v1/contents/{contentId}/seasons` → `Season[]`:
  `{ seasonId, contentId, seasonNumber, title|null, description|null }`
- `GET /api/v1/contents/{contentId}/story-units` → `StoryUnit[]`:
  `{ storyUnitId, contentId, seasonId|null, storyUnitType: "EPISODE"|"CHAPTER"|"OVA"|"MOVIE",
     unitNumber, title|null, description|null, storyOrder, releaseDate|null, createdAt, updatedAt }`
  - `storyOrder` is a **global, per-content ordering integer** (this is the spoiler-boundary unit).
  - `unitNumber` is per-season-like numbering (`unit_type` EPISODE etc.).
- Write endpoints (`POST /api/v1/contents`, `.../seasons`, `.../story-units`,
  `POST /api/v1/story-units/{id}/knowledge-chunks`) are ingest/admin surface —
  **not used by the frontend** and not yet role-restricted.

### Errors

- `@RestControllerAdvice` returns `{ "error": "<message>" }` with:
  - `404` for unknown/foreign conversations and messages of unknown resources;
  - `400` for invalid payloads/IDs;
  - `502` when the internal AI service fails, `504` when it times out.
- Security-chain failures return `{ "error": "..." }` with `401`/`403`.

### Conversations / messages (`ConversationApi` + `MessageApi`)

All endpoints below require the bearer token and operate only on the caller's data.

- `POST /api/v1/conversations` request `{ content_id, max_story_order }` →
  serialized `Conversation` entity (**camelCase, DB-generated id**):
  `{ conversationId, userId, contentId, maxStoryOrder, createdAt, updatedAt }`
  - `user_id` and `conversation_id` must be omitted (the server owns both).
  - Unknown content → 404.
- `GET /api/v1/conversations` → the caller's `Conversation[]`, most recently
  `updatedAt` first (chat turns and boundary PATCHes both touch `updatedAt`).
- `GET /api/v1/conversations/{conversationId}` → single `Conversation` (owned only).
- `PATCH /api/v1/conversations/{conversationId}` request `{ max_story_order }` →
  updated `Conversation` (owned only).
- `DELETE /api/v1/conversations/{conversationId}` → `204`, deletes the
  conversation and its messages (owned only).
- `GET /api/v1/conversations/{conversationId}/messages` → `Message[]` chronological
  (`createdAt` asc), ownership-checked:
  `{ messageId, conversationId, role: "USER"|"ASSISTANT", originalContent,
     contextualizedContent, createdAt, updatedAt }`.
- `POST .../messages` writes a **user** turn; the server forces `role = USER`.
  Not used by the frontend, which only reads history — the AI service persists
  both turns of each exchange into the shared `messages` table.

### Chat (core → internal AI)

- `POST /api/v1/conversations/{conversationId}/chat` (bearer required) request:
  ```json
  {
    "user_question": "Why did Eren do that?",
    "max_story_order": 12,
    "is_send_metadata": false,
    "enable_reranking": null
  }
  ```
  - `max_story_order` is optional; when omitted the stored boundary is used.
  - `conversation_id` and `content_id` are **not** accepted from the client.
- Response (pass-through from the AI service):
  `{ "answer": "<markdown-ish LLM text>", "chat_metadata": <object|null> }`
  - No streaming: single synchronous JSON response.
  - Ownership is verified before the AI call. The AI request is built with the
    path's `conversation_id` and the conversation's **stored** `content_id`, so a
    client cannot point retrieval at another show.

## AI service (FastAPI, :8000, root_path `/api/ai`)

Internal only — never called by the browser. Spring calls
`${AI_SERVICE_BASE_URL}/v1/chat` (default `http://localhost:8000/api/ai/v1/chat`).

- `POST /v1/chat` (through the root path) → `{ "answer": "...", "chat_metadata": ... }`.
  Request: `{ conversation_id, content_id, max_story_order, user_question,
  is_send_metadata, enable_reranking }`.
  - Chat history is fetched server-side from Postgres by `conversation_id` (last 10 turns).
  - `max_story_order` is the live spoiler boundary used for retrieval per request.
  - `chat_metadata` contains `contextualized_query`, `generation_time_seconds`,
    `token_usage`, `used_chunks[]`.
- `POST /v1/test/conversations`, `POST/GET /v1/story-unit-data` — test/ingestion
  surface, not frontend, not publicly reachable.
- No auth checks in the AI service; access control is network-level.

## Gaps & frontend decisions

| Gap in backend | Frontend decision |
|---|---|
| No artwork/poster field on `Content` | Render generated placeholder artwork (title initial + deterministic gradient). Not fake data, just an image-less UI state. |
| Conversation metadata carries no display titles/labels on the server | Local display cache (per guest, in storage) holds `showTitle`/boundary labels; the conversation index itself is server-hydrated (`GET /api/v1/conversations`). |
| Sidebar conversations | Server list merged with the local display cache; titles for conversations created on other devices are fetched on demand (`GET /api/v1/contents/{id}`). |
| Guest tokens expire after 15 minutes with no refresh | Token + user persisted; on 401 the session is cleared and a new guest registered. Old conversations belong to the previous guest and are intentionally not recovered. |
| Conversations are created via the core API | `POST /api/core/v1/conversations`; `user_id` is never sent. |
| No streaming chat endpoint | Show an active "thinking" indicator; render the full answer when it arrives. |
| Errors are now typed | Global fetch wrapper normalizes `{ error }` into `ApiError` with the HTTP status. |
