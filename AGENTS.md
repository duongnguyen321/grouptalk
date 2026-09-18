<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Project Rules

See [ARCHITECTURE.md](ARCHITECTURE.md) for system structure, data model, and the phased plan files under `plans/`.

## Code Conventions

**Task/bug workflow — always follow this order:**

1. **Research first.** Search the codebase to check whether anything related to the task/bug already exists (components, utilities, similar past fixes).
2. **Find the root cause before touching code.** Report to the user: what the root cause is, why it's happening, what the fix should be, and what the impact/blast radius is.
3. **Implement.** Fix the task/bug, check for impact on other modules, and run tests for the module you touched.

**Comments:** Do not comment to explain what code already shows. Only comment when something genuinely needs explaining (a non-obvious "why", a business rule, a gotcha).

**No hardcoding.** Extract magic values/strings into constants, config, or env vars.

**DRY.** Don't repeat yourself — no duplicated logic across files.

**Reuse existing helpers/utilities before writing new ones:**

1. Inspect the service's `package.json` for installed packages that may already provide the required behavior.
2. Search the service and shared libraries for an existing helper/utility/API with equivalent behavior.
3. If suitable functionality already exists, **reuse it** — do not introduce a new helper/utility.
4. Only add a new helper after confirming neither dependencies nor the existing codebase already solve it.
