---
name: commit-push-pr
version: 1.0.0
description: |
  Commit, push, and create PR. Pre-computes git context inline for speed.
  Runs lint + tests before committing to prevent CI failures.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
---

# /commit-push-pr — Fast Commit, Push & PR

You are running the `/commit-push-pr` workflow. This is a **fast, automated** workflow.
The user said `/commit-push-pr` — execute it end-to-end with minimal interaction.

**Always use `pnpm`, never `npm` or `bun`.**

---

## Step 0: Pre-compute context (CRITICAL — do this FIRST)

Run ALL of these in a **single parallel batch** to avoid round-trips:

```bash
# 1. Current branch
git rev-parse --abbrev-ref HEAD

# 2. Git status (never use -uall)
git status --short

# 3. Staged + unstaged diff
git diff && git diff --cached

# 4. Base branch detection
git log --oneline main..HEAD 2>/dev/null || git log --oneline develop..HEAD 2>/dev/null

# 5. Full diff against base
git diff main...HEAD --stat 2>/dev/null || git diff develop...HEAD --stat 2>/dev/null

# 6. Recent commit style
git log --oneline -5
```

Use this pre-computed context for ALL subsequent steps. Do NOT re-run these commands later.

---

## Step 1: Guard rails

1. **If on `main`:** ABORT immediately. "You're on main. Work from a feature branch."
2. **If no changes** (no staged, unstaged, or untracked files): ABORT. "Nothing to commit."
3. Determine the **base branch** (`main` or `develop`) from the pre-computed log.

---

## Step 2: Lint (MANDATORY before commit)

Run lint from the backend directory:

```bash
cd backend && pnpm lint
```

**If lint fails:**
- Show the errors clearly
- Attempt to auto-fix obvious issues (missing imports, formatting)
- If auto-fix succeeds, re-run lint to confirm
- If lint still fails after fix attempt, **STOP** and show remaining errors

---

## Step 3: Run tests (MANDATORY before commit)

```bash
cd backend && pnpm test --run
```

**If tests fail:** Show failures and **STOP**. Do not proceed.
**If tests pass:** Note the count briefly and continue.

---

## Step 4: Commit

1. Analyze the diff from Step 0. Group changes into logical commits.

2. **For small changes** (< 50 lines, < 4 files): single commit is fine.
   **For larger changes:** split into bisectable commits (dependencies first).

3. Stage files by name (never `git add -A` or `git add .`):

```bash
git add <specific-files>
```

4. Commit message format: `<type>: <description>`
   - Types: feat, fix, refactor, docs, test, chore, perf, ci
   - Match the style from recent commits (Step 0, command 6)
   - Final commit gets the co-author trailer:

```bash
git commit -m "$(cat <<'EOF'
<type>: <description>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Step 5: Push

Push to remote with upstream tracking. **Always push to the current feature branch, never to main.**

```bash
git push -u origin <current-branch>
```

---

## Step 6: Create PR

1. Determine PR base branch: use `develop` by default, `main` only if the user explicitly said so.

2. Create the PR:

```bash
gh pr create --base develop --title "<type>: <description>" --body "$(cat <<'EOF'
## Summary
<1-3 bullet points describing what changed and why>

## Checks
- [x] Lint passes (`pnpm lint`)
- [x] Tests pass (`pnpm test`)

## Test plan
<brief description of what to verify>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

3. **Output the PR URL** as the final thing the user sees.

---

## Rules

- **Never skip lint.** Lint failures must be fixed before committing.
- **Never skip tests.** Test failures stop the workflow.
- **Never force push.** Regular `git push` only.
- **Never push to `main`** unless the user explicitly requested it.
- **Always push to `develop`** as the default branch.
- **Always stage files by name** — never use `git add .` or `git add -A`.
- **Pre-compute first, act second** — the parallel bash in Step 0 is what makes this fast.
- **Minimize output** — the user wants speed, not narration. Show: lint result, test result, PR URL.
