# AI Agent Development Protocol

**Last Updated:** January 18, 2026  
**Maintained By:** Kevin @ GJS Media

This document outlines the required protocols and preferences for AI agents (GitHub Copilot, etc.) working on this codebase.

---

## 🚫 Critical Rules

### Railway Deployments
- **NEVER** automatically deploy to Railway
- Deployments to Railway must be **explicitly requested** by the user
- Wait for explicit instruction: "deploy to Railway" or similar

### Dev Server Management
- **ALWAYS** ensure the dev server is running while working
- Dev server must run on **port 3000** (configured with `strictPort: true`)
- **NEVER** show interactive prompts (h+enter, r+enter notifications)
- Use silent background execution: `nohup npm run dev > /dev/null 2>&1 &`
- After any file changes, verify the dev server is still running
- If server needs restart, use the silent method above

### Port Management
- Development server: **Port 3000 ONLY**
- If port 3000 is occupied, kill the process and restart on 3000
- Never auto-increment to 3001, 3002, etc.
- Command to clear ports: `lsof -ti:3000,3001,3002 | xargs kill -9 2>/dev/null`

---

## 📁 File & Directory Standards

### Git & Version Control
- Commit messages should be clear and descriptive
- Use conventional commit format when appropriate
- This protocol document (`AI_AGENT_PROTOCOL.md`) syncs to GitHub
- This document is for **development only** - see Railway ignore rules below

### Ignore Patterns
```
# Development-only files (ignore on Railway/production)
docs/AI_AGENT_PROTOCOL.md
.env.local
*.log
nohup.out

# User reference files (ignore everywhere)
*.ods
*.xlsx
Video Production Info*.ods
Video Production Info*.xlsx
```

---

## 🎨 UI/UX Preferences

### Typography
- **Monospace fonts ONLY in Logs page**
- All other pages use default sans-serif
- No `font-mono` class outside of `Logs.tsx`

### Statistics Cards
- Mini-dashboard statistics have been removed from:
  - Media Servers (Layers/Layer Map tabs)
  - Computers page
  - Cameras page
  - CCUs page
- Keep stats only on Dashboard and where explicitly requested

### Layout Structure
- Production info (show name, client) displays in **header top-left**
- User menu placeholder reserved in **header top-right** (40px circle)
- No "System Online" status indicators
- Sidebar focuses on navigation only

---

## 🛠️ Code Standards

### Component Styling
- Use card-based layouts for list views (Sources, Sends, etc.)
- Match styling consistency across similar pages
- Sources page styling is the reference for card layouts

### State Management
- Use Zustand with persist for all application state
- Log all CRUD operations via LogService
- Equipment changes: `LogService.logEquipmentChange()`
- Settings changes: `LogService.logSettingsChange()`

### TypeScript
- All new code must be fully typed
- No `any` types unless absolutely necessary
- Build must pass with 0 TypeScript errors

---

## 🔄 Development Workflow

### Before Making Changes
1. Verify dev server is running
2. Check current file structure with relevant tools
3. Read existing code to understand patterns

### After Making Changes
1. Run `npm run build` to verify no errors
2. Check dev server is still running
3. Commit with descriptive message
4. **DO NOT** push to Railway automatically

### Testing
- Manual testing in browser at http://localhost:3000
- Verify all CRUD operations work
- Check calculations are accurate
- Ensure localStorage persistence works

---

## 📦 Deployment

### Railway (Production)
- Manual deployment ONLY
- User must explicitly request: "deploy to Railway" or "push to production"
- This protocol document should NOT deploy to Railway
- Railway should ignore development documentation

### GitHub
- All commits should push to GitHub (unless stated otherwise)
- Protocol document syncs to GitHub for use on other development machines
- Keep commit history clean and meaningful

---

## 🎯 Current Project Context

### Recent Major Features
- Layer Map visualization for Media Servers
- Projection Screens management with calculations
- Card-based layouts for Sources and Sends
- Header/sidebar reorganization

### Active Development Areas
- Sends/Destinations management
- Projection screen calculations
- LED screen management (future)

### Known Issues
- Computer source edit modal blank page bug (on todo list, not current priority)

---

## 💡 Best Practices

### Communication
- Be concise but complete
- Confirm understanding of requirements before implementing
- Ask for clarification on ambiguous requests
- Provide progress updates for multi-step tasks

### Tool Usage
- Use `multi_replace_string_in_file` for multiple edits when possible
- Parallelize independent read operations
- Use semantic search when exact file location unknown
- Use grep for exact string matching

### Error Handling
- Always check build output for errors
- Verify dev server status after changes
- Test calculations and computed values
- Check localStorage for data integrity issues

---

## 📋 Quick Reference Commands

```bash
# Kill processes on dev ports
lsof -ti:3000,3001,3002 | xargs kill -9 2>/dev/null

# Start dev server (silent)
cd video-production-manager && (nohup npm run dev > /dev/null 2>&1 &)

# Build and check for errors
npm run build

# Commit changes
git add -A && git commit -m "descriptive message"

# Push to GitHub (NOT Railway)
git push origin main
```

---

**Remember:** This document is a living protocol. Update it when new preferences or patterns emerge.
