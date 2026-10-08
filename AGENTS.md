# Release Copy Guide

- This is an independent release-review copy, not the source workspace.
- Personal BYOK client mode is intentional; document browser storage and upstream credential transmission in RELEASE_STATUS.md. Never embed developer keys.
- Keep Web and Extension independent; both may depend on Core only.
- Build Core before client type checks, tests or local development.
- Use the locked pnpm version; do not upgrade frameworks for release cleanup.
- Commands: `corepack pnpm verify`, `corepack pnpm package:extension:check`, `corepack pnpm font:check`.
- Never embed production secrets in source or VITE_* variables.
- Retain third-party font and code notices; project license is not yet selected.
- Do not treat mock API tests as live integration verification.
