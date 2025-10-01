"use client"

import { Sheet } from "@silk-hq/components"
import { X } from "lucide-react"
import { ProjectTemplateSelect } from "./project-template-select"
import { SHEET_ANIMATIONS } from "@/lib/constants/sheet-animations"

type ProjectCreationSheetProps = {
  triggerRef: React.RefObject<HTMLButtonElement>
}

export function ProjectCreationSheet({ triggerRef }: ProjectCreationSheetProps) {
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
          <Sheet.Backdrop travelAnimation={SHEET_ANIMATIONS.centerPanel.travelAnimation} themeColorDimming="auto" />
          <Sheet.Content className="max-w-[650px] h-auto min-h-[200px] bg-transparent p-[6px]">
            <div className="h-full rounded-lg bg-white shadow-lg">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Create New Project</h2>
                  <Sheet.Trigger action="dismiss" asChild>
                    <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors">
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </Sheet.Trigger>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Project Name</label>
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter project name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Description</label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Brief description of the project"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-900">Project Template</label>
                    <ProjectTemplateSelect />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Sheet.Trigger action="dismiss" asChild>
                      <button
                        className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        onClick={() => {
                          console.log('Creating new project...');
                        }}
                      >
                        Create Project
                      </button>
                    </Sheet.Trigger>
                    <Sheet.Trigger action="dismiss" asChild>
                      <button className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors">
                        Cancel
                      </button>
                    </Sheet.Trigger>
                  </div>
                </div>
              </div>
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  )
}