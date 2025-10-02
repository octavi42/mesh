# Migration Guide: Supabase Auth → Better Auth

Your database is now **Better Auth ready**. This guide explains how to switch when you're ready.

## What's Already Done

✅ Database schema is decoupled from Supabase Auth
✅ All RLS policies use `public.current_user_id()` abstraction
✅ Better Auth tables created: `sessions`, `oauth_accounts`, `verification_tokens`
✅ Users table has Better Auth compatible columns (`password_hash`, `email_verified`)

## Current State

- Using: **Supabase Auth** (auth.users schema)
- Ready for: **Better Auth** (anytime)
- Migration effort: **~2 hours**

---

## Migration Steps (When Ready)

### 1. Install Better Auth (~5 min)

```bash
npm install better-auth
```

### 2. Create Better Auth Instance (~10 min)

Create `lib/auth.ts`:

```typescript
import { betterAuth } from "better-auth"
import { Pool } from "pg"

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL // Supabase connection string
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
})
```

### 3. Update `current_user_id()` Function (~5 min)

Run this SQL in Supabase:

```sql
create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  -- Extract session token from request headers
  select user_id
  from public.sessions
  where token = current_setting('request.jwt.claims', true)::json->>'session_token'
  and expires_at > now()
  limit 1;
$$;
```

### 4. Replace Auth Utilities (~30 min)

Replace `lib/supabase/client.ts`:

```typescript
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL
})
```

Replace middleware in `middleware.ts`:

```typescript
import { auth } from "@/lib/auth"

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers
  })

  if (!session && !request.nextUrl.pathname.startsWith('/')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}
```

### 5. Update Auth Sheet (~30 min)

Replace sign-in/sign-up logic in `components/sheets/auth-sheet.tsx`:

```typescript
import { authClient } from "@/lib/supabase/client"

const handleSignIn = async () => {
  await authClient.signIn.email({
    email,
    password,
  })
}

const handleSignUp = async () => {
  await authClient.signUp.email({
    email,
    password,
    name: displayName,
  })
}
```

### 6. Migrate Existing Users (~20 min)

Run migration helper:

```sql
-- Call the pre-built migration function
select public.migrate_to_better_auth_sessions();

-- Verify migration
select count(*) from public.sessions;
```

### 7. Remove Supabase Auth Dependencies (~10 min)

```bash
npm uninstall @supabase/supabase-js @supabase/ssr
```

Update environment variables - remove Supabase keys, add:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 8. Test (~30 min)

- [ ] Sign up new user
- [ ] Sign in existing user
- [ ] Google OAuth
- [ ] Email verification
- [ ] Password reset
- [ ] RLS policies work correctly

---

## Rollback Plan

If something goes wrong:

1. Revert `current_user_id()` to use `auth.uid()`
2. Reinstall Supabase packages
3. Restore middleware and auth utilities
4. Everything still works with Supabase Auth

---

## Benefits After Migration

✅ **No vendor lock-in** - Can move to any database
✅ **No per-user costs** - Free unlimited users
✅ **Full control** - Customize any auth flow
✅ **Type-safe** - Better TypeScript integration
✅ **Modern** - Built for Next.js 15 App Router

## When to Migrate

- **Now**: If you want maximum flexibility and no lock-in
- **Later**: If you need to ship MVP quickly (Supabase Auth works fine)
- **Never**: If you're okay staying with Supabase long-term

---

Your database is ready. The choice is yours! 🚀
