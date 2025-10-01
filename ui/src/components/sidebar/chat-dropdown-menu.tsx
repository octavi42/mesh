"use client"

import { Edit3, Type, Trash2 } from "lucide-react"

type ChatDropdownMenuProps = {
  onEdit: () => void
  onRename: () => void
  onDelete: () => void
}

export function ChatDropdownMenu({ onEdit, onRename, onDelete }: ChatDropdownMenuProps) {
  return (
    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-40">
      <button
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          onEdit()
        }}
        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 rounded-t-lg"
      >
        <Edit3 className="w-4 h-4" />
        Edit
      </button>
      <button
        onClick={onRename}
        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
      >
        <Type className="w-4 h-4" />
        Rename
      </button>
      <button
        onClick={onDelete}
        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-b-lg"
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </button>
    </div>
  )
}
