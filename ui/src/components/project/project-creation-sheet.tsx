"use client"

import { Sheet } from "@silk-hq/components"
import { X } from "lucide-react"
import { ProjectTemplateSelect } from "./project-template-select"
import { SHEET_ANIMATIONS } from "@/lib/constants/sheet-animations"
import { useState } from "react"

type ProjectCreationSheetProps = {
  triggerRef: React.RefObject<HTMLButtonElement>
}

export function ProjectCreationSheet({ triggerRef }: ProjectCreationSheetProps) {
  const [activeTab, setActiveTab] = useState<"enter" | "create">("enter")

  return (
    <Sheet.Root license="commercial">
      <Sheet.Trigger asChild>
        <button ref={triggerRef} style={{ display: 'none' }} />
      </Sheet.Trigger>
      <Sheet.Portal>
        <Sheet.View
          className="z-[100]"
          contentPlacement="center"
          tracks={["top", "bottom"]}
          nativeEdgeSwipePrevention={true}
        >
          <Sheet.Backdrop className="backdrop-blur-backdrop" />
          <Sheet.Content className="bg-transparent p-6 relative" style={{ maxWidth: '650px', width: '100%' }}>
            <div className="flex flex-col gap-4 relative">
              <div className="rounded-2xl bg-white shadow-lg p-1">
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveTab("enter")}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-xl transition-colors ${
                      activeTab === "enter"
                        ? "bg-blue-500 text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    Enter a Project
                  </button>
                  <button
                    onClick={() => setActiveTab("create")}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-xl transition-colors ${
                      activeTab === "create"
                        ? "bg-blue-500 text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    Create a Project
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-white shadow-lg p-6 min-h-[300px]">
                {activeTab === "enter" ? (
                  <div className="flex flex-col gap-4 h-full">
                    <div className="flex-1">
                      <input
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter project ID or code"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        onClick={() => {
                          console.log('Requesting project...');
                        }}
                      >
                        Request
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 h-full">
                    <div>
                      <input
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Project name"
                      />
                    </div>

                    <div>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg h-32 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Description"
                      />
                    </div>

                    <div className="flex gap-2 mt-auto">
                      <button
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        onClick={() => {
                          console.log('Creating new project...');
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  )
}