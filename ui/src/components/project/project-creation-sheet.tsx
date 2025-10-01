"use client"

import { Sheet } from "@silk-hq/components"
import { ProjectTemplateSelect } from "./project-template-select"
import { SHEET_ANIMATIONS } from "@/lib/constants/sheet-animations"
import { Component as Tabs, TabsList, TabsTrigger, TabsContent, TabsContents } from "@/components/ui/animated-tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

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
          <Sheet.Backdrop className="backdrop-blur-backdrop" />
          <Sheet.Content className="bg-transparent relative" style={{ maxWidth: '650px', width: '100%', height: 'auto' }}>
            <Tabs defaultValue="enter" className="flex flex-col gap-5">
              <TabsList className="bg-card/95 backdrop-blur-sm rounded-2xl shadow-xl border border-border/50 w-full grid grid-cols-2 h-auto p-1.5">
                <TabsTrigger value="enter">
                  Enter a Project
                </TabsTrigger>
                <TabsTrigger value="create">
                  Create a Project
                </TabsTrigger>
              </TabsList>

              <div className="rounded-2xl bg-card/95 backdrop-blur-sm shadow-xl border border-border/50">
                <TabsContents className="min-h-[320px]">
                  <TabsContent value="enter" className="flex flex-col gap-6 p-8">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Project Code</label>
                      <Input
                        placeholder="Enter project ID or code"
                        className="h-11 bg-secondary/50"
                      />
                      <p className="text-xs text-muted-foreground">Enter the unique code provided by your team lead</p>
                    </div>

                    <div className="flex gap-3 mt-auto">
                      <Button
                        className="flex-1 h-11 text-base font-medium shadow-md hover:shadow-lg transition-shadow"
                        onClick={() => {
                          console.log('Requesting project...');
                        }}
                      >
                        Request Access
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="create" className="flex flex-col gap-5 p-8">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Project Name</label>
                      <Input
                        placeholder="Enter a descriptive name"
                        className="h-11 bg-secondary/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Description</label>
                      <textarea
                        className="w-full px-4 py-3 border border-input bg-secondary/50 rounded-xl h-32 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none text-sm transition-all"
                        placeholder="Briefly describe the project goals and scope"
                      />
                    </div>

                    <div className="flex gap-3 mt-auto">
                      <Button
                        className="flex-1 h-11 text-base font-medium shadow-md hover:shadow-lg transition-shadow"
                        onClick={() => {
                          console.log('Creating new project...');
                        }}
                      >
                        Continue
                      </Button>
                    </div>
                  </TabsContent>
                </TabsContents>
              </div>
            </Tabs>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  )
}