# Git Workflow Strategy

**Last Updated:** January 30, 2026  
**Purpose:** Define git commit and push strategy for AI agent work

---

## Core Principles

### 1. **Commit Frequency**
- **Local commits:** Frequent (after each logical unit of work)
- **Remote pushes:** Less frequent (feature completion or logical stopping points)
- **Session commits:** Optional but recommended at session end

### 2. **Commit Granularity**

#### Micro Commits (Every Prompt/Task)
✅ **Pros:**
- Perfect audit trail
- Easy rollback to any point
- Clear progress tracking
- Crash recovery is trivial

❌ **Cons:**
- Cluttered git history
- Too many commits for small changes
- May push work-in-progress code

#### Macro Commits (Feature Complete)
✅ **Pros:**
- Clean git history
- Only complete features committed
- Professional commit log
- Easy code review

❌ **Cons:**
- Lose intermediate states
- Harder to identify what changed when
- Crash recovery loses work
- Less granular rollback

---

## Recommended Strategy: **Hybrid Approach**

### Local Development (Your Machine)

#### Commit Pattern: Frequent Local Commits
```bash
# After each significant change (every 10-30 minutes of work)
git add -A
git commit -m "wip: [description of what changed]"

# Examples:
git commit -m "wip: add equipment modal component structure"
git commit -m "wip: implement equipment form validation"
git commit -m "wip: connect equipment modal to API"
```

**Benefits:**
- Full audit trail locally
- Easy crash recovery
- Can roll back to any point
- Doesn't pollute remote repository

### GitHub Pushes: Feature Completion

#### Push Pattern: Squash Before Push
```bash
# When feature is complete, squash WIP commits
git rebase -i HEAD~5  # Squash last 5 commits

# Or use a clean commit
git reset --soft HEAD~5
git commit -m "feat: add equipment management modal with validation"

# Then push to GitHub
git push origin main
```

**Benefits:**
- Clean remote history
- Professional commit messages
- Features are atomic units
- Easy code review

---

## AI Agent Protocol Integration

### For AI Agents Working on Code

#### On Session Start:
1. Check git status
2. Commit any uncommitted work from previous session
3. Log session start in SESSION_JOURNAL.md

#### During Work:
1. After each file edit/creation, make a WIP commit
2. Use descriptive WIP messages
3. Update SESSION_JOURNAL.md milestones

#### On Session End (Normal):
1. Make final WIP commit
2. Update SESSION_JOURNAL.md with COMPLETED status
3. Optionally squash commits if feature complete
4. Ask user if they want to push to GitHub

#### On Crash/Interrupt:
1. Git will auto-save uncommitted work
2. Next session: commit with message "recover: [description]"
3. Update SESSION_JOURNAL.md with crash notes

---

## Commit Message Convention

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `style`: Formatting, missing semicolons, etc.
- `test`: Adding tests
- `chore`: Maintenance tasks
- `wip`: Work in progress (local only)
- `recover`: Recovery from crash

### Examples

```bash
# Work in progress (local)
git commit -m "wip: scaffold equipment modal component"

# Feature complete (push to GitHub)
git commit -m "feat(equipment): add management modal with CRUD operations

- Created EquipmentFormModal component
- Implemented validation with react-hook-form
- Connected to equipment API endpoints
- Added success/error notifications

Closes #123"

# Bug fix
git commit -m "fix(equipment): correct validation for empty fields

Previously allowed submission with empty required fields.
Added proper validation rules to form schema."

# Documentation
git commit -m "docs: add session tracking system

- Created SESSION_JOURNAL.md for session history
- Added session-log.sh helper script
- Updated AI_AGENT_PROTOCOL.md with tracking procedures"
```

---

## Workflow Commands

### Daily Development Flow

```bash
# Morning: Start fresh
git pull origin main
./scripts/session-log.sh start

# During work: Frequent local commits
git add -A
git commit -m "wip: [what you did]"

# Milestone reached: Feature commits
git add -A
git commit -m "feat: [feature description]"

# End of day: Push to GitHub
git push origin main
```

### After Crash Recovery

```bash
# Check what was uncommitted
git status
git diff

# Commit recovered work
git add -A
git commit -m "recover: [what was being worked on]"

# Continue work
./scripts/session-log.sh start
```

### Squashing WIP Commits

```bash
# Interactive rebase (last 5 commits)
git rebase -i HEAD~5

# In editor, change 'pick' to 'squash' (or 's') for commits to combine
# Save and exit
# Edit the combined commit message
# Force push if already pushed (NOT RECOMMENDED for shared branches)
git push --force-with-lease origin main
```

### Alternative: Soft Reset Method

```bash
# Reset last 5 commits but keep changes
git reset --soft HEAD~5

# Create single new commit
git commit -m "feat: complete feature with all changes"

# Push
git push origin main
```

---

## Best Practices

### DO:
- ✅ Commit frequently locally (every logical change)
- ✅ Write descriptive commit messages
- ✅ Squash WIP commits before pushing
- ✅ Keep SESSION_JOURNAL.md in sync with commits
- ✅ Tag releases/major milestones
- ✅ Use conventional commit format

### DON'T:
- ❌ Push WIP commits to GitHub (unless shared work)
- ❌ Make huge commits with many unrelated changes
- ❌ Use vague messages like "fix stuff" or "updates"
- ❌ Forget to commit before ending session
- ❌ Force push to shared branches without coordination
- ❌ Commit sensitive data (credentials, API keys)

---

## Integration with SESSION_JOURNAL.md

Every commit should have a corresponding journal entry:

```markdown
## Session 2026-01-30-153000

### Prompt 1: Add Equipment Modal
**Status:** COMPLETED
**Files Changed:**
- src/components/EquipmentFormModal.tsx (new, 150 lines)
- src/hooks/useEquipmentAPI.ts (modified, +25 lines)

**Git Commits:**
- `abc1234` - wip: scaffold equipment modal
- `def5678` - wip: add form validation
- `ghi9012` - feat(equipment): add management modal with CRUD operations

**Final Commit:** ghi9012 (pushed to GitHub)
```

---

## Quick Reference

```bash
# Status check
git status
git log --oneline -5

# Quick WIP commit
git add -A && git commit -m "wip: $(date +%H:%M) [description]"

# Feature commit
git add -A && git commit -m "feat: [description]"

# Squash last 3 commits
git reset --soft HEAD~3 && git commit -m "feat: [combined description]"

# Push to GitHub
git push origin main

# Session logging
./scripts/session-log.sh commit "feat: [description]"
```

---

**Remember:** This workflow balances detailed local history with clean remote history. Adjust based on team needs and project requirements.
