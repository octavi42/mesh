"use client"

import { Menu } from "lucide-react"
import { AccountSheet } from "@/components/sheets/account-sheet"
import { UserAvatars } from "@/components/ui/user-avatars"

type ProjectHeaderProps = {
  isMenuOpen: boolean
  onMenuToggle: () => void
  title?: string
}

export function ProjectHeader({ isMenuOpen, onMenuToggle, title }: ProjectHeaderProps) {
  const chatUsers = [
    { id: 1, name: "Alice", image: "https://i.pravatar.cc/150?img=1" },
    { id: 2, name: "Bob", image: "https://i.pravatar.cc/150?img=2" },
    { id: 3, name: "Charlie", image: "https://i.pravatar.cc/150?img=3" },
    { id: 4, name: "Diana", image: "https://i.pravatar.cc/150?img=4" },
    { id: 5, name: "Eve", image: "https://i.pravatar.cc/150?img=5" },
    { id: 6, name: "Frank", image: "https://i.pravatar.cc/150?img=6" },
    { id: 7, name: "Grace", image: "https://i.pravatar.cc/150?img=7" },
    { id: 8, name: "Hank", image: "https://i.pravatar.cc/150?img=8" },
  ]

  return (
    <div className={`p-6 ${title ? 'border-b border-slate-200/50' : ''}`}>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          <button
            className={`flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-100 transition-all duration-300 ${
              isMenuOpen ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
            onClick={onMenuToggle}
          >
            <Menu className="w-6 h-6 text-slate-600" />
          </button>
          {title && (
            <h1 className="text-xl font-light text-slate-900">
              {title}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-4 relative z-0">
          <UserAvatars users={chatUsers} size={40} maxVisible={5} isRightToLeft={true} />
          <div className="relative z-50">
            <AccountSheet />
          </div>
        </div>
      </div>
    </div>
  )
}