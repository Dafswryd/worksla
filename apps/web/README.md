# @imeri/web

Interface for the IMERI document submission system.

```
src/
  api/          backend connection (still backed by the local seed)
  components/   cross-page components + the app shell (Layout)
  constants/    seed data: roles, stages, submissions, staff, labels
  helpers/      pure derivations from the data (format, monitoring summaries)
  pages/        one folder per page; page-specific components live inside
  router/       route table
  stores/       global state (jotai)
  styles/       globals.css — tokens & component classes
```

The flow rules shared with the future backend live in
`packages/shared/src/flow.ts`.

All identifiers, file names, and comments are English. Every user-facing string
stays Indonesian — enum values that appear on screen are translated through
`constants/labels.ts` rather than being stored in Indonesian.
