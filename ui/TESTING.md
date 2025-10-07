# Testing the Complete Data Flow

## Overview
The app now fetches all data from the database based on the authenticated user's session. Only data that the user has access to (via project memberships) will be displayed.

## Database Setup

### 1. Seed Data Structure
The database has been seeded with:
- 3 test users (test-user-1, test-user-2, test-user-3)
- 3 projects with proper ownership and memberships
- 8 chats across these projects
- 12 sample messages

### 2. Project Memberships
- **TeamZ Dashboard** (project 11111111-...): All 3 users are members
- **Mobile App** (project 22222222-...): Users 1 and 2 are members
- **API Gateway** (project 33333333-...): Users 2 and 3 are members

## Testing Steps

### Step 1: Sign Up with Better Auth
1. Navigate to http://localhost:3000
2. Click "Sign In"
3. Enter an email address (e.g., myemail@test.com)
4. Use magic link or Google sign in

### Step 2: Link Your Account to Test Data
After signing up, you need to link your Better Auth account to one of the test users to see the seeded data.

Run this SQL command in your database (replace 'YOUR_BETTER_AUTH_USER_ID' with your actual user ID):

```sql
-- Update one of the test users with your Better Auth user ID
UPDATE public.users
SET id = 'YOUR_BETTER_AUTH_USER_ID'
WHERE id = 'test-user-1';

-- Update all references
UPDATE public.projects SET created_by = 'YOUR_BETTER_AUTH_USER_ID' WHERE created_by = 'test-user-1';
UPDATE public.members SET user_id = 'YOUR_BETTER_AUTH_USER_ID' WHERE user_id = 'test-user-1';
UPDATE public.chats SET created_by = 'YOUR_BETTER_AUTH_USER_ID' WHERE created_by = 'test-user-1';
UPDATE public.messages SET user_id = 'YOUR_BETTER_AUTH_USER_ID' WHERE user_id = 'test-user-1';
```

To find your Better Auth user ID, check the `public.user` table:
```sql
SELECT id, email FROM public.user ORDER BY "createdAt" DESC LIMIT 5;
```

### Step 3: Verify Data Access
After linking your account:

1. **Dashboard**: You should see only the projects you're a member of
2. **Project View**: Clicking a project shows only chats for that project
3. **Chat View**: Messages are filtered by chat, showing users and content
4. **Create Message**: Your messages are created with your user ID from session

## What's Protected

### Row-Level Security (RLS)
All queries automatically filter data based on:
- **Projects**: Only shows projects where you're a member
- **Chats**: Only shows chats in projects you're a member of
- **Messages**: Only shows messages in chats you have access to
- **Members**: Only shows members of projects you're in

### Session-Based Actions
All server actions validate your session:
- `sendMessage()`: Automatically uses your user ID from session
- `createChat()`: Sets created_by from your session
- `updateChatTitle()`: Verifies you have permission via RLS
- `deleteChat()`: Verifies you're admin or creator via RLS

## Expected Behavior

### As test-user-1 (after linking):
- See 2 projects: TeamZ Dashboard, Mobile App
- See 6 chats total (4 in Dashboard, 2 in Mobile App)
- See all messages in chats you have access to
- Can create messages that appear with your name

### Creating New Data
When you create a chat or send a message:
1. Your session is validated server-side
2. Your user ID is extracted from the session
3. Data is created with your ID
4. Only you and project members can see it

## Troubleshooting

### No Projects Showing
- Check if you linked your Better Auth user to test data
- Verify your session is active (check cookies)
- Check the `members` table has your user ID

### Can't Send Messages
- Ensure you're signed in
- Check if you're a member of the project/chat
- Look at browser console for errors

### See Wrong Data
- Verify RLS policies are enabled: `SELECT * FROM pg_tables WHERE tablename IN ('projects', 'chats', 'messages') AND rowsecurity = true;`
- Check current_user_id() returns your ID: `SELECT current_user_id();`

## Database Commands

### Reset and Reseed
```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/seed_with_members.sql
```

### Check Your Access
```sql
-- See what projects you have access to
SELECT p.* FROM public.projects p
JOIN public.members m ON m.project_id = p.id
WHERE m.user_id = current_user_id();

-- See what chats you have access to
SELECT c.* FROM public.chats c
JOIN public.members m ON m.project_id = c.project_id
WHERE m.user_id = current_user_id();
```
