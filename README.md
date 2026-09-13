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

```bash
npm install
npm run dev             # api + web together (see apps/api/README.md for setup)
npm run dev:web         # http://localhost:5173
npm run typecheck
npm run build:web
```

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
