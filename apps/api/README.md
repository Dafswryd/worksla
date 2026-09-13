# @imeri/api

Backend for the IMERI document submission system.

## Running locally

    docker compose up -d
    cp apps/api/.env.example apps/api/.env
    npm install
    npm run db:migrate -w @imeri/api
    npm run db:seed    -w @imeri/api
    npm run dev

API on `http://localhost:4000`, web on `http://localhost:5173`,
MinIO console on `http://localhost:9001` (minioadmin / minioadmin).

Every seeded account shares the password printed by the seed script.
For a real pilot use `npm run create-admin -w @imeri/api` instead.

## Layout

    src/modules/<name>/routes.ts       HTTP + zod validation only
    src/modules/<name>/service.ts      business rules, testable without HTTP
    src/modules/<name>/repository.ts   the only place that touches SQL
    src/storage/                       FileStore interface + S3 implementation
    src/jobs/                          periodic maintenance (orphan cleanup)

Flow rules are NOT reimplemented here. `packages/shared/src/flow.ts` is the
single definition: the same `isHolder()` and `canAdvance()` that light up the
buttons in the browser are the ones that reject requests in the API.

## Background cleanup

`src/jobs/cleanupOrphans.ts` runs once an hour from `src/index.ts`. It removes
`Document` rows stuck in `pending` for more than 24 hours — the trace left
behind when a user closes the tab mid-upload, after a presigned URL was
issued but before the confirm step ever ran — deleting the storage object
first and the row second.

If the object delete fails, the row is **kept** and the sweep moves on: the row
is the only record of the storage key, so dropping it would leave the object in
the bucket with nothing left to retry it. The next hourly pass tries again, and
the failure is logged. The count the function returns is objects actually
removed, not candidates found.

The same interval also sweeps expired `Session` rows via
`authRepo.deleteExpired`; this is routine hygiene, not a security boundary,
since every session read already re-checks expiry on the spot.

## Tests

    npm test -w @imeri/api

Integration tests run against the real Postgres and MinIO from
`docker-compose` — never mocks. What breaks at this layer is transactions, row
locks, unique constraints, and presigned-URL signing, none of which a mock can
reproduce.

Root `npm test` only covers `packages/shared` — `apps/api` is deliberately
excluded there (see `vitest.config.ts` at the repo root) because this suite
needs Docker and its own `.env`. Run both when verifying a change:

    npm test                  # packages/shared
    npm test -w @imeri/api    # this package

## Known gaps

- **Submission code numbers are not contiguous.** `nextCode` allocates from
  `CodeCounter` in its own small transaction, deliberately separate from the
  write that follows (see the comment on `createSubmission`), so a create that
  fails afterwards — an unowned document id, an attachment already claimed —
  burns the number it was given. Nothing reuses it. Codes stay unique and
  increasing; they just skip. Anyone counting documents by subtracting two code
  numbers will be wrong.
- `avgDays` on the workload board is always 0; computing it needs per-staff
  deltas between consecutive history entries, and nothing decides on it yet.
- No notifications of any kind. A document can sit on someone's desk for days
  without them knowing unless they open the app.
- No antivirus scanning on uploads.
- Documents are not seeded, so attachment counts differ from the prototype's
  screens.
- The frontend is NOT yet wired to this API — `apps/web` still reads its local
  seed. That is a separate phase.
