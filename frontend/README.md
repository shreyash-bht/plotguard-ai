# Plotguard AI — Frontend

Spoiler-aware AI chatbot for anime and TV shows. Pick a show, lock the episode
you've watched, and ask the AI anything — it will never reveal events beyond
your spoiler boundary.

## Stack

- Next.js 16 (App Router, Turbopack, React 19)
- TypeScript, Tailwind CSS 4
- zustand (session/conversation state), react-markdown + remark-gfm (answers), lucide-react (icons)

## Getting started

```bash
npm install
npm run dev # http://localhost:3000
```

Requires the two backend services to be running:

- **Core API** (Spring Boot) on `http://localhost:8080` — the only public backend:
  users, auth, contents, seasons, story units, conversations, messages, chat proxy
- **AI service** (FastAPI) on `http://localhost:8000` — internal chat/RAG
  (`root_path /api/ai`, routes `/v1`), called only by the core API

## Configuration

Copy/see `.env.local`:

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `/api/core` | Core API base URL used by the client |
| `CORE_API_ORIGIN` | `http://localhost:8080` | Server-side rewrite target for the core API |

The core backend sends no CORS headers, so by default all client requests go
through the same-origin proxy rewrite defined in `next.config.ts`:

- `/api/core/:path*` → `${CORE_API_ORIGIN}/api/:path*`

The AI service is not proxied: the browser never calls it. Chat is served by
Spring at `POST /api/v1/conversations/{id}/chat`, which proxies internally.

## Architecture

```
app/                      # /  · /select · /chat/[conversationId]
components/
  layout/                 # App shell, sidebar, settings, guest bootstrap
  dashboard/              # Hero section
  show/                   # Show grid (search, filters, states)
  episode/                # Episode selection + spoiler boundary flow
  chat/                   # Chat view, messages, composer, boundary modal
  ui/                     # Button, Modal, Badge, Skeleton, Spinner, artwork
services/                 # apiClient + auth/content/chat services (only place calling backends)
stores/                   # zustand: guest session, conversation index (persisted)
hooks/                    # useGuestSession
lib/                      # config, formatting, episode grouping helpers
types/                    # Exact backend DTO mirrors
docs/BACKEND_INTEGRATION.md  # Verified API contracts + known backend gaps
```

## Backend integration notes

Verified against source code; full detail in `docs/BACKEND_INTEGRATION.md`. Key
facts encoded by the frontend:

- `POST /api/v1/auth/guest-register` returns a bearer token plus a sanitized user
  (no `passwordHash`). The token is persisted with the user; every conversation
  and message call sends `Authorization: Bearer <token>`.
- Tokens expire after 15 minutes and there is no refresh endpoint. On 401 the
  session is cleared and the app registers a new guest.
- Conversations are created through the core API
  (`POST /api/core/v1/conversations`); `user_id` is never sent — the server
  derives it from the token.
- Chat goes to `POST /api/core/v1/conversations/{id}/chat`. Spring verifies
  ownership, injects the stored `content_id`, and proxies to the internal AI
  service. The browser has no AI-service route.
- Conversation lists and message history are served by the core API
  (`GET /api/core/v1/conversations` and
  `GET /api/core/v1/conversations/{id}/messages`).
