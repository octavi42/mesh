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
          <Sheet.Content className="max-w-[650px] w-full h-auto bg-transparent p-[6px]">
            <div className="h-full rounded-lg bg-white shadow-lg">
              <div className="p-6 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Project</h2>
                  <Sheet.Trigger action="dismiss" asChild>
                    <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors">
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </Sheet.Trigger>
                </div>

                <div className="flex gap-2 mb-6 border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab("enter")}
                    className={`pb-3 px-4 text-sm font-medium transition-colors ${
                      activeTab === "enter"
                        ? "text-blue-500 border-b-2 border-blue-500"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Enter a Project
                  </button>
                  <button
                    onClick={() => setActiveTab("create")}
                    className={`pb-3 px-4 text-sm font-medium transition-colors ${
                      activeTab === "create"
                        ? "text-blue-500 border-b-2 border-blue-500"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Create a Project
                  </button>
                </div>

                {activeTab === "enter" ? (
                  <div className="flex flex-col gap-4">
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
                  <div className="flex flex-col gap-4">
                    <div>
                      <input
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Project name"
                      />
                    </div>

                    <div>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg h-20 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Description"
                      />
                    </div>

                    <div className="flex gap-2">
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