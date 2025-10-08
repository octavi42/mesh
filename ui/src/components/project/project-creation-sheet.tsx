"use client"

import { Sheet } from "@silk-hq/components"
import { ProjectTemplateSelect } from "./project-template-select"
import { SHEET_ANIMATIONS } from "@/lib/constants/sheet-animations"
import { Component as Tabs, TabsList, TabsTrigger, TabsContent, TabsContents } from "@/components/ui/animated-tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { ChevronLeft, X } from "lucide-react"
import { motion } from "framer-motion"
import { TransitionPanel } from "@/components/ui/transition-panel"
import useMeasure from "react-use-measure"
import { createProjectAction } from "@/lib/actions"
import { useRouter } from "next/navigation"

type ProjectCreationSheetProps = {
  triggerRef: React.RefObject<HTMLButtonElement>
}

export function ProjectCreationSheet({ triggerRef }: ProjectCreationSheetProps) {
  const [createStep, setCreateStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [ref, bounds] = useMeasure()
  const [projectName, setProjectName] = useState("")
  const [description, setDescription] = useState("")
  const [context, setContext] = useState("")
  const [emailInput, setEmailInput] = useState("")
  const [teamMembers, setTeamMembers] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const isValidEmail = emailRegex.test(emailInput.trim())

  const handleAddEmail = () => {
    if (isValidEmail && !teamMembers.includes(emailInput.trim())) {
      setTeamMembers([...teamMembers, emailInput.trim()])
      setEmailInput("")
    }
  }

  const handleRemoveEmail = (email: string) => {
    setTeamMembers(teamMembers.filter(e => e !== email))
  }

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && isValidEmail) {
      e.preventDefault()
      handleAddEmail()
    }
  }

  const handleCreateProject = async () => {
    setIsCreating(true)
    try {
      const project = await createProjectAction({
        name: projectName,
        description,
        context,
        teamMembers,
      })

      router.push(`/project/${project.id}`)
      router.refresh()
    } catch (error) {
      console.error('Error creating project:', error)
    } finally {
      setIsCreating(false)
    }
  }

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
            <label className="text-sm font-semibold text-gray-900">Project Name</label>
            <Input
              placeholder="Enter a descriptive name"
              className="h-11 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900">Description</label>
            <textarea
              className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl h-32 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none text-sm text-gray-900 placeholder:text-gray-500 transition-all"
              placeholder="Briefly describe the project goals and scope"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
            <label className="text-sm font-semibold text-gray-900">Add Team Members</label>
            <div className="relative flex gap-2">
              <Input
                placeholder="Enter email addresses"
                className="h-11 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleEmailKeyDown}
              />
              {isValidEmail && (
                <Button
                  type="button"
                  onClick={handleAddEmail}
                  className="h-11 px-6 bg-gray-900 hover:bg-gray-800 text-white"
                >
                  Add
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-600">Press Enter after each email to add multiple members</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900">Team Members</label>
            <div className="border border-gray-200 bg-gray-50 rounded-xl p-4 min-h-[100px]">
              {teamMembers.length === 0 ? (
                <div className="flex items-center justify-center h-full min-h-[68px]">
                  <p className="text-sm text-gray-500">No members added yet</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {teamMembers.map((email) => (
                    <div
                      key={email}
                      className="inline-flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
                    >
                      <span>{email}</span>
                      <button
                        onClick={() => handleRemoveEmail(email)}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
            <label className="text-sm font-semibold text-gray-900">Project Context</label>
            <textarea
              className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-xl h-40 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none text-sm text-gray-900 placeholder:text-gray-500 transition-all"
              placeholder="Provide additional context, goals, requirements, or any relevant information about the project..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
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
            <Tabs defaultValue="enter" className="flex flex-col gap-6">
              <TabsList className="bg-white rounded-2xl shadow-lg border border-gray-200 w-full grid grid-cols-2 p-1.5" activeClassName="!bg-gray-900 !shadow-sm">
                <TabsTrigger value="enter" className="text-gray-700 data-[state=active]:!text-white data-[state=inactive]:hover:text-gray-900">
                  Enter a Project
                </TabsTrigger>
                <TabsTrigger value="create" className="text-gray-700 data-[state=active]:!text-white data-[state=inactive]:hover:text-gray-900">
                  Create a Project
                </TabsTrigger>
              </TabsList>

              <div className="rounded-2xl bg-white shadow-lg border border-gray-200">
                <TabsContents>
                  <TabsContent value="enter" className="flex flex-col gap-6 p-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-900">Project Code</label>
                      <Input
                        placeholder="Enter project ID or code"
                        className="h-11 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500"
                      />
                      <p className="text-xs text-gray-600">Enter the unique code provided by your team lead</p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        className="flex-1 h-11 text-base font-semibold shadow-sm hover:shadow-md transition-all bg-gray-900 hover:bg-gray-800 text-white"
                        onClick={() => {
                          console.log('Requesting project...');
                        }}
                      >
                        Request Access
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="create" className="p-6">
                    <div className="rounded-xl bg-gray-100 border border-gray-200 p-2 mb-6">
                      <div className="flex gap-2">
                        <motion.div
                          className="flex-1 h-2 rounded-full"
                          animate={{ backgroundColor: createStep >= 0 ? '#1f2937' : '#e5e7eb' }}
                          transition={{ duration: 0.3 }}
                        />
                        <motion.div
                          className="flex-1 h-2 rounded-full"
                          animate={{ backgroundColor: createStep >= 1 ? '#1f2937' : '#e5e7eb' }}
                          transition={{ duration: 0.3 }}
                        />
                        <motion.div
                          className="flex-1 h-2 rounded-full"
                          animate={{ backgroundColor: createStep >= 2 ? '#1f2937' : '#e5e7eb' }}
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

                    <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
                      {createStep > 0 && (
                        <Button
                          variant="outline"
                          className="h-11 border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                          onClick={() => handleSetCreateStep(createStep - 1)}
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Back
                        </Button>
                      )}
                      <Button
                        className="flex-1 h-11 text-base font-semibold shadow-sm hover:shadow-md transition-all bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => {
                          if (createStep === STEPS.length - 1) {
                            handleCreateProject();
                          } else {
                            handleSetCreateStep(createStep + 1);
                          }
                        }}
                        disabled={(createStep === 0 && !projectName.trim()) || isCreating}
                      >
                        {isCreating ? 'Creating...' : createStep === STEPS.length - 1 ? 'Create Project' : 'Continue'}
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