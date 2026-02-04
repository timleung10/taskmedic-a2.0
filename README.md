# TaskMedic — Alpha v2 (Core Stable)

Local-only FY1 workflow app (jobs + bleeps) with a calm modern UI.

## Run
```bash
npm install
npm run dev
```

## E2E smoke tests (recommended)
First time only:
```bash
npx playwright install
```

Then:
```bash
npm run test:e2e
```

## Notes
- PWA service worker is disabled in dev to avoid caching confusion.
- Storage is local (IndexedDB).
- Privacy: never store identifiable patient details.
