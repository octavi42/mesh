# Running Migrations and Seeds

## Quick Start

### 1. Make sure Supabase is running locally
```bash
# Check if Supabase is running
curl http://127.0.0.1:54321
```

### 2. Access Supabase Studio
Open in your browser: http://127.0.0.1:54323

### 3. Run Migration
1. Go to **SQL Editor** in Supabase Studio
2. Click **"New query"**
3. Copy the entire contents of `migrations/20250102000000_initial_schema.sql`
4. Paste into the editor
5. Click **"Run"** or press `Cmd+Enter`

### 4. Seed Data
1. Still in **SQL Editor**, create a new query
2. Copy the entire contents of `seed.sql`
3. Paste into the editor
4. Click **"Run"**

### 5. Verify
1. Go to **Table Editor**
2. Check that you see these tables:
   - users
   - integrations
   - user_integrations
   - projects
   - chats
   - chat_memberships
   - messages
3. Click on any table to see the data

### 6. Test the Connection
Visit: http://localhost:3000/test-db

You should see all your projects, users, and chats loaded from the database!

## Alternative: Command Line (if you have psql)

```bash
# Connect to local Supabase database
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Run migration
\i supabase/migrations/20250102000000_initial_schema.sql

# Seed data
\i supabase/seed.sql

# Exit
\q
```

## Troubleshooting

### Supabase not running?
Start it with:
```bash
npx supabase start
```

### Tables already exist?
If you need to reset:
```sql
-- Drop all tables (careful!)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chat_memberships CASCADE;
DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS user_integrations CASCADE;
DROP TABLE IF EXISTS integrations CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

Then run the migration again.
