"use client"

import { Menu } from "lucide-react"
import { AccountSheet } from "@/components/sheets/account-sheet"

type ProjectHeaderProps = {
  isMenuOpen: boolean
  onMenuToggle: () => void
  title?: string
}

export function ProjectHeader({ isMenuOpen, onMenuToggle, title }: ProjectHeaderProps) {
  return (
    <div className={`p-4 ${title ? 'border-b border-gray-200' : ''}`}>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          <button
            className={`flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-all duration-300 ${
              isMenuOpen ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
            onClick={onMenuToggle}
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          {title && (
            <h1 className="text-xl font-semibold text-gray-900">
              {title}
            </h1>
          )}
        </div>

        <AccountSheet />
      </div>
    </div>
  )
}