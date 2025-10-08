"use client"

import { useSession } from "@/lib/hooks/use-session"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useSidebarData } from "@/lib/contexts/sidebar-context"
import { UserAvatars } from "@/components/ui/user-avatars"
import { SheetStack } from "@silk-hq/components"
import { ProjectCreationSheet } from "@/components/project/project-creation-sheet"

export default function DashboardPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const { projects } = useSidebarData()
  const createProjectTriggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/")
    }
  }, [session, isPending, router])

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const handleProjectClick = (projectId: string) => {
    router.push(`/project/${projectId}`)
  }

  const currentUser = {
    id: session.user.id,
    name: session.user.name || session.user.email || "User",
    image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`,
    isAccepted: true,
  }

  return (
    <SheetStack.Root>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <header className="border-b border-slate-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm"></div>
              <span className="font-medium text-slate-900">teamz</span>
            </div>
            <div className="flex items-center gap-4">
              <UserAvatars users={[currentUser]} size={40} />
            </div>
          </div>
        </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-5xl font-light text-slate-900">
              Welcome back
            </h1>
            <p className="text-lg text-slate-600">Choose a project to continue working</p>
          </div>

          <div className="flex justify-end mb-6">
            <Button
              className="rounded-full shadow-sm"
              size="lg"
              onClick={() => createProjectTriggerRef.current?.click()}
            >
              Create Project
            </Button>
          </div>

          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <button
                  key={project.value}
                  onClick={() => handleProjectClick(project.value)}
                  className="group p-6 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all text-left"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-3xl">{project.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-lg text-slate-900 group-hover:text-blue-600 transition-colors">
                        {project.label}
                      </h3>
                    </div>
                  </div>
                  {project.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-medium text-slate-900 mb-2">No projects yet</h3>
                  <p className="text-slate-500 mb-6">Create your first project to get started</p>
                </div>
                <Button
                  className="rounded-full shadow-sm"
                  size="lg"
                  onClick={() => createProjectTriggerRef.current?.click()}
                >
                  Create Project
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <ProjectCreationSheet triggerRef={createProjectTriggerRef} />
      </div>
    </SheetStack.Root>
  )
}
