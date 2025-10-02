"use client"

import { X, Settings } from "lucide-react"
import Select from "@/components/ui/select"
import { type Project } from "@/lib/types"

type SidebarHeaderProps = {
  onClose: () => void
  onSettingsClick: () => void
  currentProject: Project
  projects: Project[]
  onProjectChange: (projectValue: string) => void
}

export function SidebarHeader({ onClose, onSettingsClick, currentProject, projects, onProjectChange }: SidebarHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Select
            data={projects}
            defaultValue={currentProject.value}
            onChange={onProjectChange}
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onSettingsClick}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Settings className="w-5 h-5 text-slate-500" />
          </button>
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
