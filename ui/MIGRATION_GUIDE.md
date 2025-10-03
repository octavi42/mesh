# Database Migration Guide

## ✅ Completed Setup

### Data Access Layer Created:
- **`src/lib/db/users.ts`** - User queries (getUsers, getUserById, getChatUsers)
- **`src/lib/db/projects.ts`** - Project queries (getProjects, getProjectById)
- **`src/lib/db/chats.ts`** - Chat queries (getChatsByProjectId, getChatById)
- **`src/lib/db/messages.ts`** - Message queries (getMessagesByChatId, createMessage)

### Server Actions Created:
- **`src/lib/actions/chat-actions.ts`** - Chat mutations (create, update, delete, manage members)
- **`src/lib/actions/message-actions.ts`** - Message mutations (send, delete)

## 🔄 Migration Strategy

Since your app uses **client components** with context (`SidebarProvider`), here's the migration approach:

### Option 1: Server Component Approach (Recommended)
Convert page components to server components that fetch data and pass it as props:

**Example:**
```tsx
// app/project/[id]/page.tsx
import { getProjects, getChatsByProjectId } from '@/lib/db'

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const projects = await getProjects()
  const chats = await getChatsByProjectId(params.id)

  return (
    <ProjectLayoutClient
      projects={projects}
      chats={chats}
      projectId={params.id}
    />
  )
}
```

### Option 2: Keep Context, Load Data Once
Update `SidebarProvider` to accept props from server component:

```tsx
// app/layout.tsx (server component)
import { getProjects } from '@/lib/db'

export default async function RootLayout({ children }) {
  const projects = await getProjects()

  return (
    <html>
      <body>
        <SidebarProvider initialProjects={projects}>
          {children}
        </SidebarProvider>
      </body>
    </html>
  )
}
```

## 📝 Next Steps to Complete Migration

1. **Setup Supabase** (if not done):
   - Follow `SUPABASE_SETUP.md`
   - Run migrations and seed data

2. **Test Database Connection**:
   ```typescript
   // Test in any server component
   import { getProjects } from '@/lib/db'
   const projects = await getProjects()
   console.log(projects)
   ```

3. **Update Context Provider** (Option 2):
   ```typescript
   // src/lib/contexts/sidebar-context.tsx
   export function SidebarProvider({
     children,
     initialProjects,
     initialChats
   }: {
     children: ReactNode
     initialProjects: Project[]
     initialChats: Chat[]
   }) {
     return (
       <SidebarContext.Provider value={{
         projects: initialProjects,
         chats: initialChats
       }}>
         {children}
       </SidebarContext.Provider>
     )
   }
   ```

4. **Update Root Layout**:
   ```typescript
   // app/layout.tsx
   import { getProjects } from '@/lib/db'

   export default async function RootLayout({ children }) {
     const projects = await getProjects()

     return (
       <SidebarProvider initialProjects={projects} initialChats={[]}>
         {children}
       </SidebarProvider>
     )
   }
   ```

5. **Update Page Components** to fetch chats:
   ```typescript
   // app/project/[id]/page.tsx
   import { getChatsByProjectId } from '@/lib/db'

   export default async function ProjectPage({ params }) {
     const chats = await getChatsByProjectId(params.id)
     // Pass chats to your client components
   }
   ```

6. **Update Chat Page** to fetch messages:
   ```typescript
   // app/project/[id]/[chatId]/page.tsx
   import { getMessagesByChatId, getChatUsers } from '@/lib/db'

   export default async function ChatPage({ params }) {
     const messages = await getMessagesByChatId(params.chatId)
     const users = await getChatUsers(params.chatId)

     return <ChatPageClient messages={messages} users={users} />
   }
   ```

## 🎯 Quick Win: Test First Page

To quickly test if database connection works:

1. Make sure Supabase is set up (`.env.local` has correct values)
2. Update one page to use database:

```typescript
// app/test-db/page.tsx
import { getProjects, getUsers } from '@/lib/db'

export default async function TestDB() {
  const projects = await getProjects()
  const users = await getUsers()

  return (
    <div>
      <h1>Database Test</h1>
      <h2>Projects: {projects.length}</h2>
      <h2>Users: {users.length}</h2>
      <pre>{JSON.stringify(projects, null, 2)}</pre>
    </div>
  )
}
```

3. Visit `/test-db` to verify data loads!

## 🚀 Ready to Go!

All database functions are ready. Once you:
1. Set up Supabase
2. Run migrations
3. Seed data
4. Update a few components

Your app will be fully database-powered! 🎉
