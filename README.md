# IMERI — Document Submission System

Cross-cluster document submission interface for IMERI. One document travels from
a submitter in a cluster → the secretary for its category → the Deputy Director
(QC + initials) → the Director (signature) → back to the secretary to be
recorded → the submitter is notified.

A rejection moves the document back **one step only**, along with comments that
automatically become a revision checklist.

The interface itself is written in Indonesian; the code, folder names, and
documentation are in English.

## Structure

Follows the SprintIQ monorepo layout.

```
apps/web            React + Vite + TypeScript (the interface)
apps/api            Express + Prisma + PostgreSQL + MinIO (the backend)
packages/shared     domain types & flow rules shared by FE/BE
```

`apps/web` is not yet wired to `apps/api` — the interface still reads its data
from `apps/web/src/constants`. Connecting the two is a separate phase; see
`apps/api/README.md` for how to run the backend on its own in the meantime.

## Running

The interface alone needs nothing but `npm install` — it still reads its local
seed:

```bash
npm install
npm run dev:web         # http://localhost:5173
```

The backend needs Postgres and MinIO running, a `.env`, and a migrated
database. Without all three, `npm run dev` starts the web server and the API
exits immediately:

```bash
docker compose up -d                    # Postgres :5432, MinIO :9000 (console :9001)
cp apps/api/.env.example apps/api/.env
npm install
npm run db:migrate -w @imeri/api
npm run db:seed    -w @imeri/api        # dev accounts, password printed by the script
npm run dev                             # api :4000 + web :5173 together
```

Checks:

```bash
npm test                  # packages/shared — pure flow rules, no services needed
npm test -w @imeri/api    # apps/api — needs docker compose up and apps/api/.env
npm run typecheck         # web + api
npm run build:web
npm run build -w @imeri/api
```

The two test commands are separate suites and neither runs the other; run both
when verifying a change. See `apps/api/README.md` for the backend in detail.

## Roles you can try

The login screen uses an account combobox; the password is not checked.

| Role | Example account | Scope |
|---|---|---|
| Submitter | Rina Kartika | submissions they created |
| Secretary | Sari Dewi / Budi Santoso / Tuti Marlina | one category only |
| Deputy Director | Hendra Wijaya | all categories, QC + initials |
| Director | Ratna Puspita | final signature |
| Super Admin | Yoga Pratama | all clusters + edit the flow rules |
| Cluster Monitor | Nadia Rahma / Ferry Gunawan | one cluster, read-only |

## Design notes

- Colour tokens, typography, and component classes come from SprintIQ. Only
  three blue tokens are overridden with the IMERI brand colours (the second
  `:root` block in `globals.css`).
- Per-stage deadlines (SLA) and the category → secretary route live in
  `stores/flowAtom.ts` and can be changed by the super admin at runtime.
- Domain values are English keys (`finance`, `returned`, `deputy`); their
  Indonesian screen labels live in `constants/labels.ts`.
