"use client"

import { useState, useRef, useEffect } from "react"

type EditableChatTitleProps = {
  title: string
  onTitleChange: (newTitle: string) => void
}

export function EditableChatTitle({ title, onTitleChange }: EditableChatTitleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleBlur = () => {
    setIsEditing(false)
    if (editValue.trim()) {
      onTitleChange(editValue.trim())
    } else {
      setEditValue(title)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleBlur()
    } else if (e.key === "Escape") {
      setEditValue(title)
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="text-xl font-light text-slate-900 bg-transparent border-none outline-none focus:ring-0 p-0 w-full"
        placeholder="Chat title"
      />
    )
  }

  return (
    <h1
      onClick={() => setIsEditing(true)}
      className="text-xl font-light text-slate-900 cursor-text hover:text-slate-700 transition-colors"
    >
      {title}
    </h1>
  )
}
