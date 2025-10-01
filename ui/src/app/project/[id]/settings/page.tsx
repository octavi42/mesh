"use client"

import { use } from "react"
import { ProjectLayout } from "@/components/layout/project-layout"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

export default function ProjectSettings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  return (
    <ProjectLayout projectId={id} headerTitle="Settings">
      <div className="flex-1 flex flex-col animate-in fade-in duration-300 min-h-0">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-medium text-gray-900">Project Settings</h2>
              <p className="text-sm text-gray-500">Manage your project configuration and preferences.</p>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Project Information</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><span className="font-medium">Project ID:</span> {id}</p>
                  <p><span className="font-medium">Status:</span> Active</p>
                  <p><span className="font-medium">Created:</span> January 2024</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Team Settings</h3>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700">
                    Manage Team Members
                  </button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700">
                    Permissions & Roles
                  </button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700">
                    Notification Settings
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Project Configuration</h3>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700">
                    Integration Settings
                  </button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700">
                    API Configuration
                  </button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-200 text-sm text-gray-700">
                    Backup & Export
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
