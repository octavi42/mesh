import { getProjects, getUsers, getChatsByProjectId } from '@/lib/db'

export default async function TestDBPage() {
  try {
    const projects = await getProjects()
    const users = await getUsers()
    const chats = projects.length > 0 ? await getChatsByProjectId(projects[0].id) : []

    return (
      <div className="p-8 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Database Connection Test</h1>

        {/* Projects Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            ✅ Projects ({projects.length})
          </h2>
          <div className="grid gap-4">
            {projects.map((project) => (
              <div key={project.id} className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  <div>
                    <h3 className="font-semibold">{project.name}</h3>
                    <p className="text-sm text-gray-600">ID: {project.id.substring(0, 8)}...</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Users Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            ✅ Users ({users.length})
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {users.map((user) => (
              <div key={user.id} className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatar_url || ''}
                    alt={user.display_name || user.email}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <h3 className="font-semibold">{user.display_name || 'Unknown'}</h3>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chats Section */}
        {chats.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              ✅ Chats for {projects[0].label} ({chats.length})
            </h2>
            <div className="grid gap-2">
              {chats.map((chat) => (
                <div key={chat.id} className="bg-white p-3 rounded-lg shadow">
                  <h3 className="font-medium">{chat.title}</h3>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success Message */}
        <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-xl font-semibold text-green-800 mb-2">
            🎉 Database Connected Successfully!
          </h3>
          <p className="text-green-700">
            All data is being loaded from your local Supabase database.
          </p>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Database error:', error)
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-red-600">
          ❌ Database Connection Error
        </h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-red-800 mb-2">
            Failed to connect to database
          </h3>
          <p className="text-red-700 mb-4">
            {error instanceof Error ? error.message : JSON.stringify(error)}
          </p>
          <pre className="text-xs bg-white p-2 rounded overflow-auto">
            {error instanceof Error ? error.stack : String(error)}
          </pre>
          <div className="bg-white p-4 rounded border border-red-300">
            <h4 className="font-semibold mb-2">Troubleshooting Steps:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Make sure Supabase is running locally (check port 54321)</li>
              <li>Run the migration: Copy SQL from supabase/migrations/20250102000000_initial_schema.sql</li>
              <li>Seed the data: Copy SQL from supabase/seed.sql</li>
              <li>Check .env.local has correct values</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }
}
