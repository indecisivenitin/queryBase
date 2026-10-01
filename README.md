# querybase (Ask My Docs)

A multi-tenant RAG service. Users upload documents (PDF, txt, md) into a workspace and ask questions about them. Answers come back with source citations.

The project is built backend-first, mainly to learn and demonstrate RAG with pgvector, Redis (caching, rate limiting, job queues) and load balancing with Nginx, with measured numbers at the end.

## Tech stack

| Layer | Choice |
|---|---|
| API | Node.js + Express (plain JS, ES modules) |
| Database | PostgreSQL 17 + pgvector |
| Cache / queue | Redis 7 (BullMQ later) |
| Embeddings | Local model, all-MiniLM-L6-v2 (384 dimensions) |
| LLM | Free tier (Gemini or Groq) |
| Frontend | React (Vite), planned for Phase 5 |
| Infra | Docker Compose, Nginx later |

## Repo structure

```
querybase/
├── docker-compose.yml
├── .env                 # local only, not committed
├── .env.example         # variable names to copy from
├── infra/
│   └── init.sql         # enables the pgvector extension on first DB start
├── server/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── package.json
│   ├── server.js        # entry point, connects to DB then starts Express
│   └── src/
│       ├── app.js       # Express app and routes
│       └── db.js        # pg connection pool (reads DATABASE_URL)
└── client/              # placeholder, frontend comes in Phase 5
```

## Getting started

Prerequisites: Docker with Compose v2.

1. Create the env file and fill in your own values (letters and numbers only for the password, so the connection URL stays valid):

   ```bash
   cp .env.example .env
   ```

   ```
   POSTGRES_USER=
   POSTGRES_PASSWORD=
   POSTGRES_DB=
   ```

2. Start everything:

   ```bash
   docker compose up -d --build
   ```

3. Verify:

   ```bash
   curl localhost:8081/health
   # {"status":"ok","db":"up","pgvector":true}

   docker compose exec redis redis-cli ping
   # PONG

   docker compose exec db psql -U <POSTGRES_USER> -d <POSTGRES_DB> -c "\dx"
   # should list both plpgsql and vector
   ```

Useful commands:

```bash
docker compose logs -f server      # live server logs
docker compose down                # stop, keep data
docker compose down -v             # stop and delete the database volume
```

### Ports

| Service | Container port | Host port |
|---|---|---|
| server | 8080 | 8081 |
| db | 5432 | 4444 |
| redis | 6379 | 6379 |

Inside the Compose network the server reaches the services by name (`db:5432`, `redis:6379`). The host ports are only for debugging from your own machine.

## Phase 0: Infrastructure and skeleton (done)

What was set up:

- **Docker Compose stack** with three services: the Express server, PostgreSQL with pgvector, and Redis.
- **Secrets out of the code.** Credentials live in `.env`, Compose injects them, and the server builds its connection from a single `DATABASE_URL`. Nothing sensitive is hardcoded or committed.
- **Startup ordering.** The DB has a `pg_isready` healthcheck and the server uses `depends_on: service_healthy`, so the API never starts before Postgres is ready.
- **pgvector enabled automatically.** `infra/init.sql` runs `CREATE EXTENSION IF NOT EXISTS vector;` the first time the DB volume is created.
- **Production-minded Dockerfile.** Pinned `node:22-slim` image (slim rather than alpine, since the embedding runtime needs glibc), `npm ci --omit=dev`, runs as the non-root `node` user, plus a `.dockerignore` so `node_modules` and `.env` never enter the image.
- **Health endpoint.** `GET /health` checks the DB connection and whether the vector extension is installed.
- **Temporary test routes.** `GET/POST /users` exist only to prove the API and DB work together. They are removed in Phase 1.

### Gotchas we hit (worth remembering)

- **Init scripts run once.** Anything in `/docker-entrypoint-initdb.d/` (and `POSTGRES_DB`) only applies when the data volume is brand new. After changing them, run `docker compose down -v` and start again.
- **Bind mount to a missing path creates a directory.** If a mounted file does not exist on the host, Docker creates an empty folder with that name and Postgres fails with "Is a directory".
- **Docker Desktop on Linux cannot bind-mount external drives.** It runs in a VM that only sees certain folders, so the project lives under the home directory (`~/projects/querybase`).
- **Build context vs `.dockerignore`.** With `build: ./server`, the `.dockerignore` must sit inside `server/`.

## Phase 1: Schema and migrations (next)

Goal: replace the throwaway `users` table with a real multi-tenant schema, created by versioned migrations instead of ad hoc queries.

Planned tables:

| Table | Purpose |
|---|---|
| `users` | id, email, password_hash |
| `workspaces` | id, name, owner_id |
| `workspace_members` | workspace_id, user_id, role |
| `documents` | id, workspace_id, filename, status (`pending`, `processing`, `ready`, `failed`), created_at |
| `chunks` | id, document_id, workspace_id, content, chunk_index, `embedding vector(384)`, `tsv tsvector` |

Design notes:

- `workspace_id` is also stored on `chunks`, so every retrieval query can filter by tenant directly without a join. This is the core of the multi-tenancy.
- Embedding dimension is 384 to match all-MiniLM-L6-v2.
- Vector (HNSW) and full-text (GIN) indexes are deferred to Phase 4, where their effect is measured.

Migration approach (plain SQL, no extra dependency):

- `server/migrations/001_init.sql` holds the schema.
- `server/src/migrate.js` runs the SQL files in order and records applied ones in a `schema_migrations` table, so each runs exactly once.
- `npm run migrate` runs it.
- The temporary `CREATE TABLE users` in `server.js` and the `/users` routes are removed.

Done when: `npm run migrate` creates all tables, running it twice changes nothing, and `\dt` in psql shows the full schema.

## Roadmap

| Phase | Focus |
|---|---|
| 0 | Docker Compose, Postgres + pgvector, Redis, Express skeleton (done) |
| 1 | Schema and migrations |
| 2 | Auth: register, login, JWT, workspace membership checks |
| 3 | RAG core: upload, chunk, embed, retrieve, answer with citations |
| 4 | Retrieval quality: hybrid search (vector + full-text), HNSW index, eval set |
| 5 | Simple React frontend: login, upload, chat with citations |
| 6 | Redis: answer cache, sliding-window rate limiter, BullMQ ingestion queue |
| 7 | Load balancing: stateless API, multiple replicas behind Nginx |
| 8 | Load testing with k6, benchmark numbers |
| 9 | Deployment, CI, final README with architecture and results |
