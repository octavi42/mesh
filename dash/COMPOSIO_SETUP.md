# Composio MVP Setup Guide

## Complete Setup Requirements for Local Development

## ✅ What's Configured

### 1. API Key & Environment
```env
# .env.local (copy from .env.example)
NEXT_PUBLIC_COMPOSIO_API_KEY=your_composio_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Get your API key from [https://app.composio.dev/](https://app.composio.dev/)

### 2. OAuth Flow Components
- **Auth Service**: `/src/lib/auth.ts` - Handles Composio v3 API with automatic auth config creation
- **OAuth Callback**: `/src/app/api/auth/callback/route.ts` - Processes OAuth redirects
- **API Proxy**: `/src/app/api/composio/[...path]/route.ts` - Handles CORS issues
- **Connection Context**: `/src/contexts/ConnectionContext.tsx` - Manages OAuth state

### 3. Project Management System (NEW!)
- **Types**: `/src/types/project.ts` - Project, User, and Integration types
- **Storage**: `/src/lib/storage.ts` - localStorage-based data management
- **Context**: `/src/contexts/ProjectContext.tsx` - Project state management

---

## 🎯 How Your MVP Works

### Architecture Overview
```
User → Creates Projects → Adds Integrations to Projects → OAuth Flow → Connected!
```

### 1. Multi-Tenant Structure
- **Users**: Each user gets a unique entity ID stored in localStorage
- **Projects**: Users create multiple projects (e.g., "Email Automation", "CRM Sync")
- **Integrations**: Each project can have multiple connected integrations
- **Connections**: OAuth connections are managed per project

### 2. Data Flow
```typescript
// User creates a project
const project = createProject("Email Automation", "Handles all email tasks");

// User adds Gmail integration to project
connectIntegration(gmailToolkit); // Triggers OAuth flow

// On successful OAuth, integration is linked to project
addIntegrationToProject(project.id, "gmail", connectionId);
```

---

## 🔧 Necessary Setup Steps

### Step 1: Install Dependencies (Already Done ✅)
Your `package.json` already has all required dependencies.

### Step 2: Start Development Server
```bash
cd /Users/cristeaoctavian/Dev/startups/teamai/dash
npm run dev
```

### Step 3: Access Your App
- **URL**: http://localhost:3000
- **OAuth Callback**: http://localhost:3000/api/auth/callback (automatically configured)

---

## 📱 Using the MVP

### Project Management
```typescript
import { useProject } from '@/contexts/ProjectContext';

function MyComponent() {
  const {
    projects,
    currentProject,
    createProject,
    setCurrentProject,
    addIntegrationToProject
  } = useProject();

  // Create a new project
  const handleCreateProject = () => {
    const project = createProject("My New Project", "Description here");
    setCurrentProject(project);
  };
}
```

### Integration Management
```typescript
import { useConnection } from '@/contexts/ConnectionContext';
import { useProject } from '@/contexts/ProjectContext';

function IntegrationButton({ toolkit }) {
  const { connectIntegration, isConnected, isLoading } = useConnection();
  const { currentProject, addIntegrationToProject } = useProject();

  const handleConnect = async () => {
    if (!currentProject) return;
    
    try {
      // This triggers OAuth popup
      await connectIntegration(toolkit);
      
      // On success, link to current project
      addIntegrationToProject(
        currentProject.id, 
        toolkit.slug, 
        connectionId
      );
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  return (
    <button 
      onClick={handleConnect}
      disabled={isLoading(toolkit.slug)}
    >
      {isConnected(toolkit.slug) ? 'Connected' : 'Connect'}
    </button>
  );
}
```

---

## 🔑 Key Features of Your MVP

### 1. **No Database Required**
- All data stored in browser's localStorage
- Perfect for local development and demos
- Easy to export/import data

### 2. **Multi-Tenant by Design**
- Each user gets unique entity ID
- Projects are isolated per user
- Integrations are scoped to projects

### 3. **Automatic OAuth Management**
- Auto-creates Composio auth configs
- Handles 600+ integrations automatically
- No manual dashboard setup required

### 4. **Real-time Connection Status**
- Live connection state tracking
- Progress messages during OAuth
- Error handling and retry logic

---

## 🛠 Composio Integration Details

### What Happens When User Connects:

1. **Auth Config Creation** (Automatic)
   ```typescript
   // Your auth service automatically creates auth configs
   const authConfigId = await createAuthConfig(toolkit);
   ```

2. **OAuth Initiation**
   ```typescript
   // Composio v3 API call
   POST /v3/connected_accounts
   {
     "entity_id": "user_123",
     "integration": "gmail",
     "auth_config": { "id": "auth_config_xyz" },
     "connection": { "redirect_url": "http://localhost:3000/api/auth/callback" }
   }
   ```

3. **Popup OAuth Flow**
   - User gets redirected to Gmail/Slack/etc.
   - After authorization, redirected to your callback
   - Popup closes, connection is verified

4. **Project Integration**
   ```typescript
   // Link the connection to the current project
   addIntegrationToProject(projectId, "gmail", connectionId);
   ```

---

## 🚦 Quick Start Commands

```bash
# Start development (if not already running)
npm run dev

# Check if server is running
curl http://localhost:3000/api/composio/v1/apps

# Test OAuth callback endpoint
curl http://localhost:3000/api/auth/callback
```

---

## 📊 Data Storage Structure

### localStorage Keys:
- `teamai_user` - Current user data
- `teamai_projects` - All user projects
- `teamai_project_integrations` - Integration-to-project mappings
- `teamai_current_project` - Active project ID
- `composio_entity_id` - Composio entity identifier

### Export/Import Data:
```typescript
import { useProject } from '@/contexts/ProjectContext';

const { exportData, importData, clearAllData } = useProject();

// Export all data
const backup = exportData();

// Import from backup
importData(backup.data);

// Reset everything
clearAllData();
```

---

## 🎉 You're Ready!

Your Composio integration is **fully functional** with:
- ✅ Working OAuth flow for 600+ apps
- ✅ Automatic auth config creation
- ✅ Multi-tenant project architecture
- ✅ No database dependency
- ✅ Real-time connection management

Just run `npm run dev` and start connecting integrations to your projects!