# 🚀 Quick Reference: Database Reset Workflow

## TL;DR - Starting Fresh

```bash
cd video-production-manager/api
npm run db:reset
```

That's it! You now have:
- ✅ Clean database schema (all migrations applied)
- ✅ Equipment library loaded (~30 items)
- ✅ Settings loaded (connectors, formats, etc.)
- ✅ 2 sample productions ready to test with

---

## Common Commands

### Full Reset (Recommended for new branches)
```bash
npm run db:reset
```

### Just the Data (Keep existing schema)
```bash
npm run seed:equipment  # Equipment library
npm run seed:settings   # Connector types, formats
npm run seed:sample     # Sample productions
```

### Check What's in the Database
```bash
# Via API (requires server running)
curl http://localhost:3010/api/productions

# Via psql
psql video_production -c "SELECT show_name, client FROM productions;"
```

---

## What Each Script Does

### `npm run db:reset`
1. **Warns you** (3 second countdown to cancel)
2. **Drops** all tables and data
3. **Migrates** - runs all migrations to recreate schema
4. **Seeds**:
   - Equipment specs from JSON
   - Settings (connectors, formats, etc.)
   - 2 sample productions

### `npm run db:migrate`
- Applies pending migrations only
- Doesn't touch existing data

### `npm run seed:equipment`
- Loads equipment library from `equipment-data.json`
- Safe to run multiple times (checks for duplicates)

### `npm run seed:sample`
- Creates 2 test productions
- Safe to run multiple times (checks for duplicates)

---

## When to Use Each Command

### `npm run db:reset`
Use when:
- 🆕 Starting work on a new branch
- 🔄 Just pulled new migrations
- 🐛 Database is in a weird/corrupted state
- 🧹 Want to start with clean test data

### `npm run seed:equipment`
Use when:
- Equipment list seems wrong/outdated
- Just updated `equipment-data.json`
- Testing equipment-related features

### `npm run seed:sample`
Use when:
- Need fresh test productions
- Deleted all your test data
- Want predictable starting data

---

## Safety Notes

✅ **Safe Operations:**
- All these commands only affect YOUR local database
- Production database on Railway is completely isolated
- .env file keeps the two databases separate

⚠️ **Important:**
- These commands will **delete local data**
- Any test productions you created will be gone
- That's the point! Fresh start every time

🚨 **NEVER:**
- Never run these against production
- Never commit your .env file
- Never set DATABASE_URL to Railway in .env

---

## Environment Setup

### First Time Only

1. Copy template:
   ```bash
   cp .env.example .env
   ```

2. Edit .env (use your PostgreSQL username):
   ```bash
   DATABASE_URL="postgresql://kevin@localhost:5432/video_production"
   ```

3. Create database:
   ```bash
   createdb video_production
   ```

4. First reset:
   ```bash
   npm run db:reset
   ```

---

## Troubleshooting

### "Database video_production does not exist"
```bash
createdb video_production
npm run db:reset
```

### "Can't connect to database"
```bash
# Check PostgreSQL is running
pg_isready

# Check your .env
cat .env | grep DATABASE_URL
```

### "Equipment/Settings not showing"
```bash
npm run seed:equipment
npm run seed:settings
```

### "Want to start completely fresh"
```bash
dropdb video_production
createdb video_production
npm run db:reset
```

---

## Sample Productions Included

### 1. Morning News Show
- Client: ABC Network
- Venue: Studio A
- Status: Planning
- ID: `sample-prod-1`

### 2. Live Concert Special  
- Client: XYZ Productions
- Venue: Madison Square Garden
- Status: Active
- ID: `sample-prod-2`

These give you data to test with immediately. Delete or modify them as needed!

---

## Full Documentation

For comprehensive guide, see: [api/docs/DATABASE_WORKFLOW.md](./api/docs/DATABASE_WORKFLOW.md)
