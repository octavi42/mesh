"use client"

import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input"
import { Button } from "@/components/ui/button"
import { ArrowUp, Paperclip, Square, X } from "lucide-react"
import { useRef } from "react"

type ChatInputProps = {
  input: string
  onInputChange: (value: string) => void
  isLoading: boolean
  onSubmit: () => void
  files: File[]
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveFile: (index: number) => void
}

export function ChatInput({
  input,
  onInputChange,
  isLoading,
  onSubmit,
  files,
  onFileChange,
  onRemoveFile,
}: ChatInputProps) {
  const uploadInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="p-4">
      <div className="mx-auto max-w-3xl">
        <PromptInput
          value={input}
          onValueChange={onInputChange}
          isLoading={isLoading}
          onSubmit={onSubmit}
          className="w-full"
        >
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="bg-blue-50 border border-blue-200 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-blue-900"
                >
                  <Paperclip className="size-4" />
                  <span className="max-w-[120px] truncate">{file.name}</span>
                  <button
                    onClick={() => onRemoveFile(index)}
                    className="hover:bg-blue-100 rounded-full p-1 text-blue-700"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <PromptInputTextarea placeholder="Type your message..." />

          <PromptInputActions className="flex items-center justify-between gap-2 pt-2">
            <PromptInputAction tooltip="Attach files">
              <label
                htmlFor="file-upload"
                className="hover:bg-gray-100 flex h-8 w-8 cursor-pointer items-center justify-center rounded-2xl transition-colors"
              >
                <input
                  ref={uploadInputRef}
                  type="file"
                  multiple
                  onChange={onFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <Paperclip className="text-gray-600 size-5" />
              </label>
            </PromptInputAction>

            <PromptInputAction
              tooltip={isLoading ? "Stop generation" : "Send message"}
            >
              <Button
                variant="default"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={onSubmit}
              >
                {isLoading ? (
                  <Square className="size-5 fill-current" />
                ) : (
                  <ArrowUp className="size-5" />
                )}
              </Button>
            </PromptInputAction>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  )
}