"use client"

import { useState, use } from "react"
import { ProjectLayout } from "@/components/layout/project-layout"
import { ChatInput } from "@/components/chat/chat-input"

export default function ProjectChat({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [files, setFiles] = useState<File[]>([])

  const handleSubmit = () => {
    if (input.trim() || files.length > 0) {
      setIsLoading(true)
      console.log("Sending message:", input)
      console.log("Project ID:", id)

      setTimeout(() => {
        setIsLoading(false)
        setInput("")
        setFiles([])
      }, 2000)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files)
      setFiles((prev) => [...prev, ...newFiles])
    }
  }

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <ProjectLayout projectId={id}>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex h-full items-center justify-center text-gray-400">
          Start chatting with your team...
        </div>
      </div>

      <ChatInput
        input={input}
        onInputChange={setInput}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        files={files}
        onFileChange={handleFileChange}
        onRemoveFile={handleRemoveFile}
      />
    </ProjectLayout>
  )
}