"use client"

import { use } from "react"
import { ProjectLayout } from "@/components/layout/project-layout"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useSidebarData } from "@/lib/contexts/sidebar-context"

export default function ChatSettings({ params }: { params: Promise<{ id: string; chatId: string }> }) {
  const { id, chatId } = use(params)
  const router = useRouter()
  const { projects, chats } = useSidebarData()

  const currentProject = projects.find(p => p.value === id) || projects[0]
  const currentChat = chats.find(c => c.id === chatId)

  return (
    <ProjectLayout projectId={id} currentChatId={chatId} headerTitle={`${currentChat?.title} Settings`}>
      <div className="flex-1 flex flex-col animate-in fade-in duration-300 min-h-0">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-medium text-gray-900">Chat Settings</h2>
              <p className="text-sm text-gray-500">Manage settings for this specific chat.</p>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Chat Information</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><span className="font-medium">Chat ID:</span> {chatId}</p>
                  <p><span className="font-medium">Title:</span> {currentChat?.title}</p>
                  <p><span className="font-medium">Project:</span> {currentProject.label}</p>
                  <p><span className="font-medium">Created:</span> January 2024</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Chat Configuration</h3>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700">
                    Rename Chat
                  </button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700">
                    Chat Permissions
                  </button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700">
                    Notification Settings
                  </button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700">
                    Message History
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Advanced Options</h3>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700">
                    Export Chat History
                  </button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700">
                    Archive Chat
                  </button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-100 text-sm text-red-600">
                    Delete Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProjectLayout>
  )
}
