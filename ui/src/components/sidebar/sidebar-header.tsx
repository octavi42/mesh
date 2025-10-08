"use client"

import Link from "next/link"
import { X, Settings } from "lucide-react"
import Select from "@/components/ui/select"
import { type Project } from "@/lib/types"

type SidebarHeaderProps = {
  onClose: () => void
  currentProject: Project
  projects: Project[]
  projectId: string
}

export function SidebarHeader({ onClose, currentProject, projects, projectId }: SidebarHeaderProps) {
  const handleProjectChange = (projectValue: string) => {
    window.location.href = `/project/${projectValue}`
  }
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Select
            data={projects}
            defaultValue={currentProject.value}
            onChange={handleProjectChange}
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/project/${projectId}/settings`}
            prefetch={true}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Settings className="w-5 h-5 text-slate-500" />
          </Link>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
      </div>
    </div>
  )
}
