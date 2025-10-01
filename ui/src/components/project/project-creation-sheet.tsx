"use client"

import { Sheet } from "@silk-hq/components"
import { ProjectTemplateSelect } from "./project-template-select"
import { SHEET_ANIMATIONS } from "@/lib/constants/sheet-animations"
import { Component as Tabs, TabsList, TabsTrigger, TabsContent, TabsContents } from "@/components/ui/animated-tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { ChevronLeft } from "lucide-react"
import { motion } from "framer-motion"
import { TransitionPanel } from "@/components/ui/transition-panel"
import useMeasure from "react-use-measure"

type ProjectCreationSheetProps = {
  triggerRef: React.RefObject<HTMLButtonElement>
}

export function ProjectCreationSheet({ triggerRef }: ProjectCreationSheetProps) {
  const [createStep, setCreateStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [ref, bounds] = useMeasure()

  const handleSetCreateStep = (newStep: number) => {
    setDirection(newStep > createStep ? 1 : -1)
    setCreateStep(newStep)
  }

  const STEPS = [
    {
      title: "Project Details",
      content: (
        <div className="space-y-5" ref={ref}>
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
        </div>
      )
    },
    {
      title: "Add Team Members",
      content: (
        <div className="space-y-5" ref={ref}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Add Team Members</label>
            <Input
              placeholder="Enter email addresses"
              className="h-11 bg-secondary/50"
            />
            <p className="text-xs text-muted-foreground">Press Enter after each email to add multiple members</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Team Members</label>
            <div className="border border-input bg-secondary/30 rounded-xl p-3 min-h-[120px]">
              <p className="text-xs text-muted-foreground text-center">No members added yet</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Project Context",
      content: (
        <div className="space-y-5" ref={ref}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Project Context</label>
            <textarea
              className="w-full px-4 py-3 border border-input bg-secondary/50 rounded-xl h-48 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none text-sm transition-all"
              placeholder="Provide additional context, goals, requirements, or any relevant information about the project..."
            />
          </div>
        </div>
      )
    }
  ]

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
          <Sheet.Backdrop
            travelAnimation={{
              opacity: "1",
              backgroundColor: ({ progress }) => `rgba(0, 0, 0, ${Math.min(progress * 0.33, 0.33)})`,
              backdropFilter: ({ progress }) => `blur(${progress * 20}px)`,
            }}
          />
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

                  <TabsContent value="create" className="p-8">
                    <div className="rounded-xl bg-secondary/30 border border-border/30 p-1 mb-6">
                      <div className="flex gap-1">
                        <motion.div
                          className="flex-1 h-1.5 rounded-full"
                          animate={{ backgroundColor: createStep >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--secondary))' }}
                          transition={{ duration: 0.3 }}
                        />
                        <motion.div
                          className="flex-1 h-1.5 rounded-full"
                          animate={{ backgroundColor: createStep >= 1 ? 'hsl(var(--primary))' : 'hsl(var(--secondary))' }}
                          transition={{ duration: 0.3 }}
                        />
                        <motion.div
                          className="flex-1 h-1.5 rounded-full"
                          animate={{ backgroundColor: createStep >= 2 ? 'hsl(var(--primary))' : 'hsl(var(--secondary))' }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>

                    <TransitionPanel
                      activeIndex={createStep}
                      className="overflow-hidden"
                      variants={{
                        enter: (direction) => ({
                          x: direction > 0 ? 400 : -400,
                          opacity: 0,
                          height: bounds.height > 0 ? bounds.height : "auto",
                        }),
                        center: {
                          zIndex: 1,
                          x: 0,
                          opacity: 1,
                          height: bounds.height > 0 ? bounds.height : "auto",
                        },
                        exit: (direction) => ({
                          zIndex: 0,
                          x: direction < 0 ? 400 : -400,
                          opacity: 0,
                          position: "absolute",
                          top: 0,
                          width: "100%",
                        }),
                      }}
                      transition={{
                        x: { type: "spring", stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 },
                        height: { type: "spring", stiffness: 300, damping: 30 },
                      }}
                      custom={direction}
                    >
                      {STEPS.map((step, index) => (
                        <div key={index}>
                          {step.content}
                        </div>
                      ))}
                    </TransitionPanel>

                    <div className="flex gap-3 pt-6">
                      {createStep > 0 && (
                        <Button
                          variant="outline"
                          className="h-11"
                          onClick={() => handleSetCreateStep(createStep - 1)}
                        >
                          <ChevronLeft className="w-4 h-4 mr-2" />
                          Back
                        </Button>
                      )}
                      <Button
                        className="flex-1 h-11 text-base font-medium shadow-md hover:shadow-lg transition-shadow"
                        onClick={() => {
                          if (createStep === STEPS.length - 1) {
                            console.log('Creating new project...');
                          } else {
                            handleSetCreateStep(createStep + 1);
                          }
                        }}
                      >
                        {createStep === STEPS.length - 1 ? 'Create Project' : 'Continue'}
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