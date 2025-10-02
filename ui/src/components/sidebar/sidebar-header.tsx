"use client"

import { X, Settings } from "lucide-react"

type SidebarHeaderProps = {
  onClose: () => void
  onSettingsClick: () => void
}

export function SidebarHeader({ onClose, onSettingsClick }: SidebarHeaderProps) {
  return (
    <div className="flex items-center justify-end mb-6">
      <div className="flex items-center gap-2">
        <button
          onClick={onSettingsClick}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <Settings className="w-5 h-5 text-slate-500" />
        </button>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>
    </div>
  )
}
