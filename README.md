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
packages/shared     domain types & flow rules shared by FE/BE
```

`apps/api` does not exist yet — all data is still seeded in
`apps/web/src/constants`. The `apps/web/src/api` layer is already in place as
the connection point for a future backend.

## Running

```bash
npm install
npm run dev:web        # http://localhost:5173
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
