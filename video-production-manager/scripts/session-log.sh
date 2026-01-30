#!/bin/bash

# Session Tracking Helper Script
# Purpose: Assist with logging AI agent session work to SESSION_JOURNAL.md
# Usage: ./session-log.sh [action] [details]

set -e

JOURNAL_PATH="$(dirname "$0")/../docs/SESSION_JOURNAL.md"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
SESSION_ID=$(date +"%Y%m%d%H%M%S")

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function show_usage() {
    echo "Usage: ./session-log.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  start              Start a new session"
    echo "  prompt <desc>      Log a new prompt"
    echo "  milestone <desc>   Log a milestone"
    echo "  commit <msg>       Make a git commit and log it"
    echo "  complete <notes>   Complete current session"
    echo "  crash <notes>      Log a crash/incomplete session"
    echo "  show               Show recent sessions"
    echo ""
    echo "Examples:"
    echo "  ./session-log.sh start"
    echo "  ./session-log.sh prompt 'Add new equipment modal'"
    echo "  ./session-log.sh milestone 'Created component structure'"
    echo "  ./session-log.sh commit 'feat: add equipment modal'"
    echo "  ./session-log.sh complete 'Successfully added modal functionality'"
}

function start_session() {
    echo -e "${GREEN}Starting new session: $SESSION_ID${NC}"
    
    cat >> "$JOURNAL_PATH" << EOF

## Session $SESSION_ID
**Started:** $TIMESTAMP
**Status:** ACTIVE

### Prompt 1: [Describe the initial request here]
**ID:** S$SESSION_ID-P1-$(date +"%H%M%S")
**Request:** [User request]
**Context:** [Relevant files, current state]

#### Milestones:
- [ ] M1: [First milestone]

#### Actions Taken:
1. Session started

#### Outcome:
- **Status:** IN_PROGRESS

---

EOF

    echo -e "${GREEN}✓${NC} Session logged to SESSION_JOURNAL.md"
    echo -e "${BLUE}Session ID:${NC} $SESSION_ID"
}

function log_prompt() {
    local desc="$1"
    if [ -z "$desc" ]; then
        echo -e "${YELLOW}Error: Prompt description required${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Logging prompt:${NC} $desc"
    echo "Manual update required in SESSION_JOURNAL.md"
    echo "Add prompt details under current session"
}

function log_milestone() {
    local desc="$1"
    if [ -z "$desc" ]; then
        echo -e "${YELLOW}Error: Milestone description required${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Milestone:${NC} $desc"
    echo "Manual update required in SESSION_JOURNAL.md"
    echo "Mark milestone as complete: [x] M#: $desc"
}

function make_commit() {
    local msg="$1"
    if [ -z "$msg" ]; then
        echo -e "${YELLOW}Error: Commit message required${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}Creating git commit...${NC}"
    
    # Stage all changes
    git add -A
    
    # Create commit
    git commit -m "$msg" || {
        echo -e "${YELLOW}Warning: No changes to commit${NC}"
        return 1
    }
    
    # Get commit hash
    COMMIT_HASH=$(git rev-parse --short HEAD)
    
    echo -e "${GREEN}✓ Committed:${NC} $COMMIT_HASH - $msg"
    echo ""
    echo "Update SESSION_JOURNAL.md with:"
    echo "**Git Commit:** $COMMIT_HASH"
    echo "**Commit Message:** $msg"
}

function complete_session() {
    local notes="$1"
    echo -e "${GREEN}Session completing...${NC}"
    echo ""
    echo "Update SESSION_JOURNAL.md:"
    echo "1. Change **Status:** from ACTIVE to COMPLETED"
    echo "2. Add **Ended:** $TIMESTAMP"
    echo "3. Add completion notes: $notes"
    echo "4. Move session from 'Active' to 'Historical Sessions'"
    echo ""
    echo -e "${BLUE}Consider making a final commit if needed${NC}"
}

function log_crash() {
    local notes="$1"
    echo -e "${YELLOW}⚠ Logging crash/incomplete session${NC}"
    echo ""
    echo "Update SESSION_JOURNAL.md:"
    echo "1. Change **Ended:** to 'CRASHED' or timestamp"
    echo "2. Add crash notes under 'Outcome'"
    echo "3. Document what was being attempted"
    echo "4. Add to 'Crash Recovery Notes' section"
    echo ""
    echo "Crash notes: $notes"
}

function show_sessions() {
    echo -e "${BLUE}Recent Sessions:${NC}"
    echo ""
    grep -E "^## Session [0-9]+" "$JOURNAL_PATH" | tail -5
    echo ""
    echo "View full journal: $JOURNAL_PATH"
}

# Main script logic
case "${1:-help}" in
    start)
        start_session
        ;;
    prompt)
        log_prompt "$2"
        ;;
    milestone)
        log_milestone "$2"
        ;;
    commit)
        make_commit "$2"
        ;;
    complete)
        complete_session "$2"
        ;;
    crash)
        log_crash "$2"
        ;;
    show)
        show_sessions
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        echo -e "${YELLOW}Unknown command: $1${NC}"
        echo ""
        show_usage
        exit 1
        ;;
esac
