# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - Name: `teamz-ui`
   - Database Password: (generate a strong password)
   - Region: Choose closest to you
6. Click "Create new project"
7. Wait for project to be provisioned (~2 minutes)

## Step 2: Get API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (under Project API)
   - **anon public** key
   - **service_role** key (keep this secret!)

## Step 3: Configure Environment Variables

1. Create `.env.local` file in the project root (if it doesn't exist)
2. Add your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Important:** Never commit `.env.local` to git!

## Step 4: Run Database Migration

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the contents of `supabase/migrations/20250102000000_initial_schema.sql`
4. Paste into the SQL Editor
5. Click "Run" or press `Ctrl+Enter`
6. Verify no errors appear

## Step 5: Seed the Database

1. Still in the SQL Editor, create a new query
2. Copy the contents of `supabase/seed.sql`
3. Paste into the SQL Editor
4. Click "Run"
5. Verify the data was inserted successfully

## Step 6: Verify Data

1. Go to **Table Editor** in Supabase dashboard
2. Check that these tables exist:
   - users
   - integrations
   - user_integrations
   - projects
   - chats
   - chat_memberships
   - messages
3. Click on each table to verify data was inserted

## Step 7: Test the Connection

Run your Next.js development server:

```bash
npm run dev
```

The app should now connect to your Supabase database!

## Troubleshooting

### Error: "Invalid API key"
- Double-check your `.env.local` file has the correct keys
- Make sure you're using the **anon public** key, not the service role key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restart your dev server after changing environment variables

### Error: "Failed to connect to database"
- Verify your Project URL is correct
- Check if your Supabase project is active (not paused)
- Ensure your IP is not blocked (check Supabase dashboard → Settings → Database)

### Error: "Table does not exist"
- Make sure you ran the migration SQL (Step 4)
- Check for SQL errors in the Supabase logs

### No data showing
- Ensure you ran the seed SQL (Step 5)
- Check the table data in Supabase Table Editor

## Next Steps

Once setup is complete, the app will:
- ✅ Connect to Supabase database
- ✅ Load users, projects, chats from database
- ✅ Display real data instead of dummy data

You can now start building features that interact with the database!
