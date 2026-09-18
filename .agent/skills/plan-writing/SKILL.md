---
name: plan-writing
description: Structured task planning with clear breakdowns, dependencies, and verification criteria. Use when implementing features, refactoring, or any multi-step work.
allowed-tools: Read, Glob, Grep
---

# Plan Writing

> Source: obra/superpowers

## Overview
This skill provides a framework for breaking down work into clear, actionable tasks with verification criteria.

## Task Breakdown Principles

### 1. Small, Focused Tasks
- Each task should take 2-5 minutes
- One clear outcome per task
- Independently verifiable

### 2. Clear Verification
- How do you know it's done?
- What can you check/test?
- What's the expected output?

### 3. Logical Ordering
- Dependencies identified
- Parallel work where possible
- Critical path highlighted
- **Phase X: Verification is always LAST**

### 4. Dynamic Naming in Project Root
- Plan files are saved as `{task-slug}.md` in the PROJECT ROOT
- Name derived from task (e.g., "add auth" → `auth-feature.md`)
- **NEVER** inside `.agent/`, `docs/`, or temp folders

## Planning Principles (NOT Templates!)

> 🔴 **NO fixed templates. Each plan is UNIQUE to the task.**

### Principle 1: Keep It SHORT

| ❌ Wrong | ✅ Right |
|----------|----------|
| 50 tasks with sub-sub-tasks | 5-10 clear tasks max |
| Every micro-step listed | Only actionable items |
| Verbose descriptions | One-line per task |

> **Rule:** If plan is longer than 1 page, it's too long. Simplify.

---

### Principle 2: Be SPECIFIC, Not Generic

| Wrong | Right |
|----------|----------|
| "Set up project" | "Run `npx create-next-app`" |
| "Add authentication" | "Install next-auth, create `/api/auth/[...nextauth].ts`" |
| "Style the UI" | "Add Tailwind classes to `Header.tsx`" |
| "Create NestJS module" | "Run `nest g module users && nest g service users && nest g controller users`" |
| "Move file to new location" | "Run `mv src/old/path.ts src/new/path.ts`" |

> **Rule:** Each task should have a clear, verifiable outcome.

---

### Principle 3: Dynamic Content Based on Project Type

**For NEW PROJECT:**
- What tech stack? (decide first)
- What's the MVP? (minimal features)
- What's the file structure?

**For FEATURE ADDITION:**
- Check `package.json` for installed packages that solve this (check first)
- Scan existing components, utils, services for reusable code
- Which files are affected?
- What dependencies needed?
- How to verify it works?

**For BUG FIX:**
- Check `package.json` for installed packages that may address the root cause
- What's the root cause?
- What file/line to change?
- How to test the fix?

---

### Principle 4: Scripts Are Project-Specific

> **DO NOT copy-paste script commands. Choose based on project type.**

| Project Type | Relevant Scripts |
|--------------|------------------|
| Frontend/React | `ux_audit.py`, `accessibility_checker.py` |
| Backend/API | `api_validator.py`, `security_scan.py` |
| Mobile | `mobile_audit.py` |
| Database | `schema_validator.py` |
| Full-stack | Mix of above based on what you touched |

**Wrong:** Adding all scripts to every plan
**Right:** Only scripts relevant to THIS task

---

### Principle 5: CLI First

> If a framework has a CLI, **always use it** instead of manually creating files.

| Framework | CLI Command (use this) | Never do this |
|-----------|------------------------|---------------|
| NestJS | `nest g module/service/controller/guard/pipe <name>` | Manually write `*.module.ts` |
| Next.js | `npx create-next-app` / `npx shadcn add <component>` | Manually copy component files |
| Prisma | `prisma migrate dev --name <name>` / `prisma generate` | Manually edit migration SQL |
| React | `npx create-react-app` | Manually scaffold `src/` structure |
| Expo | `npx create-expo-app` | Manually write `app.json` + entry files |
| Angular | `ng g component/service/module <name>` | Manually create `*.component.ts` |

**Rule:** If `nest g`, `ng g`, `prisma`, or any framework CLI can generate the file — use it.

---

### Principle 6: Shell Commands First

> If a file system operation can be done with a shell command, **always prefer the command**.

| Task | Use This | Not This |
|------|----------|----------|
| Move a file | `mv src/old.ts src/new.ts` | Create new file → copy content → delete old |
| Copy a file | `cp src/template.ts src/new.ts` | Manually recreate the file |
| Create directory tree | `mkdir -p src/feature/{components,hooks,utils}` | Create folders one by one |
| Find files by pattern | `find src -name "*.spec.ts"` | List files manually |
| Rename across files | `sed -i '' 's/OldName/NewName/g' src/**/*.ts` | Edit each file individually |
| Delete files | `rm -rf src/deprecated/` | Delete one by one |

**Rule:** Prefer `mv`, `cp`, `mkdir -p`, `find`, `sed`, `rm` over manual file operations in every task.

---

### Principle 7: Verification is Simple

| ❌ Wrong | ✅ Right |
|----------|----------|
| "Verify the component works correctly" | "Run `npm run dev`, click button, see toast" |
| "Test the API" | "curl localhost:3000/api/users returns 200" |
| "Check styles" | "Open browser, verify dark mode toggle works" |

---

## Plan Structure (Flexible, Not Fixed!)

```
# [Task Name]

## Goal
One sentence: What are we building/fixing? What business rule does it implement?

## Resolution
- Packages used: [list installed packages from package.json being used, or "none"]
- Reused code: [existing components/utils being reused, or "none"]
- New code needed: [brief list of new files/functions to create]

## Tasks
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 1 | [Specific action] | [path/to/file.ts] | [How to check] |
| 2 | [Specific action] | [path/to/file.ts] | [How to check] |

## File Changes

### `path/to/file.ts`
**Business Logic:** [Why this file changes — the user story or rule it implements]
**Technical Logic:** [What changes — new function, state update, API call, etc.]
**Change Rationale:** [Why this approach, not another]

**Pattern sketch:**
```ts
// Shape only — structure, not full implementation
function doSomething(input: Type): Result {
  // step 1: validate
  // step 2: call existingService
  // step 3: return transformed
}
```

## Done When
- [ ] [Main success criteria]
- [ ] [Secondary success criteria]
```

> **Keep it short.** Max 10 tasks. File Changes section is mandatory — skip it only for trivial single-line fixes.

---

## Best Practices (Quick Reference)

1. **Start with goal** - What are we building/fixing?
2. **Max 10 tasks** - If more, break into multiple plans
3. **Each task verifiable** - Clear "done" criteria
4. **Project-specific** - No copy-paste templates
5. **Update as you go** - Mark `[x]` when complete
6. **CLI First** - Use framework CLIs (`nest g`, `prisma migrate`, etc.) instead of manual file creation
7. **Shell Commands First** - Use `mv`, `cp`, `mkdir -p` instead of manual file operations

---

## When to Use

- New project from scratch
- Adding a feature
- Fixing a bug (if complex)
- Refactoring multiple files
